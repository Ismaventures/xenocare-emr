-- Migration: 124_nhis_drugs_price_update.sql
-- Description: Update NHIS drug prices for any drugs with missing prices
-- Source: nhia_medicines_2025_supabase.csv
-- Generated: 2026-02-05

-- First, check for drugs with null/zero prices
-- SELECT code, name, nhis_price FROM drug_catalogue 
-- WHERE is_nhis_covered = true AND (nhis_price IS NULL OR nhis_price = 0);

BEGIN;

-- Update prices for all NHIS drugs (ensures any missing prices are filled)
UPDATE drug_catalogue SET nhis_price = 250, updated_at = NOW() 
WHERE code = 'NHIA-01-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 250);
UPDATE drug_catalogue SET nhis_price = 2700, updated_at = NOW() 
WHERE code = 'NHIA-01-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2700);
UPDATE drug_catalogue SET nhis_price = 11000, updated_at = NOW() 
WHERE code = 'NHIA-01-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11000);
UPDATE drug_catalogue SET nhis_price = 4200, updated_at = NOW() 
WHERE code = 'NHIA-01-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4200);
UPDATE drug_catalogue SET nhis_price = 6500, updated_at = NOW() 
WHERE code = 'NHIA-01-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6500);
UPDATE drug_catalogue SET nhis_price = 155, updated_at = NOW() 
WHERE code = 'NHIA-01-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 155);
UPDATE drug_catalogue SET nhis_price = 970, updated_at = NOW() 
WHERE code = 'NHIA-01-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 970);
UPDATE drug_catalogue SET nhis_price = 800, updated_at = NOW() 
WHERE code = 'NHIA-01-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 800);
UPDATE drug_catalogue SET nhis_price = 180, updated_at = NOW() 
WHERE code = 'NHIA-01-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 180);
UPDATE drug_catalogue SET nhis_price = 3900, updated_at = NOW() 
WHERE code = 'NHIA-01-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3900);
UPDATE drug_catalogue SET nhis_price = 8500, updated_at = NOW() 
WHERE code = 'NHIA-01-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8500);
UPDATE drug_catalogue SET nhis_price = 3526, updated_at = NOW() 
WHERE code = 'NHIA-01-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3526);
UPDATE drug_catalogue SET nhis_price = 10, updated_at = NOW() 
WHERE code = 'NHIA-01-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10);
UPDATE drug_catalogue SET nhis_price = 670, updated_at = NOW() 
WHERE code = 'NHIA-01-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 670);
UPDATE drug_catalogue SET nhis_price = 110, updated_at = NOW() 
WHERE code = 'NHIA-01-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 110);
UPDATE drug_catalogue SET nhis_price = 1138, updated_at = NOW() 
WHERE code = 'NHIA-01-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1138);
UPDATE drug_catalogue SET nhis_price = 4636, updated_at = NOW() 
WHERE code = 'NHIA-01-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4636);
UPDATE drug_catalogue SET nhis_price = 2733, updated_at = NOW() 
WHERE code = 'NHIA-01-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2733);
UPDATE drug_catalogue SET nhis_price = 1464, updated_at = NOW() 
WHERE code = 'NHIA-01-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1464);
UPDATE drug_catalogue SET nhis_price = 2684, updated_at = NOW() 
WHERE code = 'NHIA-01-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2684);
UPDATE drug_catalogue SET nhis_price = 1985, updated_at = NOW() 
WHERE code = 'NHIA-01-03-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1985);
UPDATE drug_catalogue SET nhis_price = 1687, updated_at = NOW() 
WHERE code = 'NHIA-01-03-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1687);
UPDATE drug_catalogue SET nhis_price = 3285, updated_at = NOW() 
WHERE code = 'NHIA-01-03-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3285);
UPDATE drug_catalogue SET nhis_price = 1342, updated_at = NOW() 
WHERE code = 'NHIA-01-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1342);
UPDATE drug_catalogue SET nhis_price = 5000, updated_at = NOW() 
WHERE code = 'NHIA-01-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5000);
UPDATE drug_catalogue SET nhis_price = 1281, updated_at = NOW() 
WHERE code = 'NHIA-01-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1281);
UPDATE drug_catalogue SET nhis_price = 4597, updated_at = NOW() 
WHERE code = 'NHIA-01-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4597);
UPDATE drug_catalogue SET nhis_price = 2013, updated_at = NOW() 
WHERE code = 'NHIA-01-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2013);
UPDATE drug_catalogue SET nhis_price = 2879, updated_at = NOW() 
WHERE code = 'NHIA-01-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2879);
UPDATE drug_catalogue SET nhis_price = 1174, updated_at = NOW() 
WHERE code = 'NHIA-01-04-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1174);
UPDATE drug_catalogue SET nhis_price = 1708, updated_at = NOW() 
WHERE code = 'NHIA-01-04-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1708);
UPDATE drug_catalogue SET nhis_price = 8500, updated_at = NOW() 
WHERE code = 'NHIA-02-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8500);
UPDATE drug_catalogue SET nhis_price = 8500, updated_at = NOW() 
WHERE code = 'NHIA-02-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8500);
UPDATE drug_catalogue SET nhis_price = 920, updated_at = NOW() 
WHERE code = 'NHIA-02-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 920);
UPDATE drug_catalogue SET nhis_price = 2300, updated_at = NOW() 
WHERE code = 'NHIA-02-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2300);
UPDATE drug_catalogue SET nhis_price = 4000, updated_at = NOW() 
WHERE code = 'NHIA-02-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4000);
UPDATE drug_catalogue SET nhis_price = 85, updated_at = NOW() 
WHERE code = 'NHIA-02-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 85);
UPDATE drug_catalogue SET nhis_price = 700, updated_at = NOW() 
WHERE code = 'NHIA-02-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 700);
UPDATE drug_catalogue SET nhis_price = 2655, updated_at = NOW() 
WHERE code = 'NHIA-02-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2655);
UPDATE drug_catalogue SET nhis_price = 3076, updated_at = NOW() 
WHERE code = 'NHIA-02-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3076);
UPDATE drug_catalogue SET nhis_price = 400, updated_at = NOW() 
WHERE code = 'NHIA-02-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 400);
UPDATE drug_catalogue SET nhis_price = 242, updated_at = NOW() 
WHERE code = 'NHIA-02-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 242);
UPDATE drug_catalogue SET nhis_price = 329, updated_at = NOW() 
WHERE code = 'NHIA-02-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 329);
UPDATE drug_catalogue SET nhis_price = 3900, updated_at = NOW() 
WHERE code = 'NHIA-02-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3900);
UPDATE drug_catalogue SET nhis_price = 30, updated_at = NOW() 
WHERE code = 'NHIA-02-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 30);
UPDATE drug_catalogue SET nhis_price = 27, updated_at = NOW() 
WHERE code = 'NHIA-02-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 27);
UPDATE drug_catalogue SET nhis_price = 228, updated_at = NOW() 
WHERE code = 'NHIA-02-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 228);
UPDATE drug_catalogue SET nhis_price = 440, updated_at = NOW() 
WHERE code = 'NHIA-02-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 440);
UPDATE drug_catalogue SET nhis_price = 482, updated_at = NOW() 
WHERE code = 'NHIA-02-03-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 482);
UPDATE drug_catalogue SET nhis_price = 120, updated_at = NOW() 
WHERE code = 'NHIA-02-03-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 120);
UPDATE drug_catalogue SET nhis_price = 1090, updated_at = NOW() 
WHERE code = 'NHIA-02-03-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1090);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-02-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 180, updated_at = NOW() 
WHERE code = 'NHIA-02-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 180);
UPDATE drug_catalogue SET nhis_price = 210, updated_at = NOW() 
WHERE code = 'NHIA-02-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 210);
UPDATE drug_catalogue SET nhis_price = 350, updated_at = NOW() 
WHERE code = 'NHIA-02-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 350);
UPDATE drug_catalogue SET nhis_price = 60, updated_at = NOW() 
WHERE code = 'NHIA-02-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 60);
UPDATE drug_catalogue SET nhis_price = 35, updated_at = NOW() 
WHERE code = 'NHIA-02-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 35);
UPDATE drug_catalogue SET nhis_price = 125, updated_at = NOW() 
WHERE code = 'NHIA-02-04-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 125);
UPDATE drug_catalogue SET nhis_price = 1200, updated_at = NOW() 
WHERE code = 'NHIA-02-04-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1200);
UPDATE drug_catalogue SET nhis_price = 340, updated_at = NOW() 
WHERE code = 'NHIA-02-04-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 340);
UPDATE drug_catalogue SET nhis_price = 78, updated_at = NOW() 
WHERE code = 'NHIA-02-04-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 78);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-02-04-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 43, updated_at = NOW() 
WHERE code = 'NHIA-02-04-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 43);
UPDATE drug_catalogue SET nhis_price = 55, updated_at = NOW() 
WHERE code = 'NHIA-02-04-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 55);
UPDATE drug_catalogue SET nhis_price = 1000, updated_at = NOW() 
WHERE code = 'NHIA-02-04-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1000);
UPDATE drug_catalogue SET nhis_price = 200, updated_at = NOW() 
WHERE code = 'NHIA-02-04-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 200);
UPDATE drug_catalogue SET nhis_price = 281, updated_at = NOW() 
WHERE code = 'NHIA-02-04-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 281);
UPDATE drug_catalogue SET nhis_price = 1700, updated_at = NOW() 
WHERE code = 'NHIA-02-04-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1700);
UPDATE drug_catalogue SET nhis_price = 177, updated_at = NOW() 
WHERE code = 'NHIA-02-04-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 177);
UPDATE drug_catalogue SET nhis_price = 226, updated_at = NOW() 
WHERE code = 'NHIA-02-04-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 226);
UPDATE drug_catalogue SET nhis_price = 25, updated_at = NOW() 
WHERE code = 'NHIA-02-04-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 25);
UPDATE drug_catalogue SET nhis_price = 150, updated_at = NOW() 
WHERE code = 'NHIA-02-04-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 150);
UPDATE drug_catalogue SET nhis_price = 120, updated_at = NOW() 
WHERE code = 'NHIA-02-04-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 120);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-02-04-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 940, updated_at = NOW() 
WHERE code = 'NHIA-02-04-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 940);
UPDATE drug_catalogue SET nhis_price = 623, updated_at = NOW() 
WHERE code = 'NHIA-02-04-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 623);
UPDATE drug_catalogue SET nhis_price = 871, updated_at = NOW() 
WHERE code = 'NHIA-02-04-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 871);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-02-04-27' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 110, updated_at = NOW() 
WHERE code = 'NHIA-02-04-28' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 110);
UPDATE drug_catalogue SET nhis_price = 208, updated_at = NOW() 
WHERE code = 'NHIA-02-04-29' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 208);
UPDATE drug_catalogue SET nhis_price = 800, updated_at = NOW() 
WHERE code = 'NHIA-02-04-30' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 800);
UPDATE drug_catalogue SET nhis_price = 160, updated_at = NOW() 
WHERE code = 'NHIA-02-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 160);
UPDATE drug_catalogue SET nhis_price = 180, updated_at = NOW() 
WHERE code = 'NHIA-02-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 180);
UPDATE drug_catalogue SET nhis_price = 180, updated_at = NOW() 
WHERE code = 'NHIA-02-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 180);
UPDATE drug_catalogue SET nhis_price = 160, updated_at = NOW() 
WHERE code = 'NHIA-02-05-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 160);
UPDATE drug_catalogue SET nhis_price = 146, updated_at = NOW() 
WHERE code = 'NHIA-02-05-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 146);
UPDATE drug_catalogue SET nhis_price = 120, updated_at = NOW() 
WHERE code = 'NHIA-02-05-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 120);
UPDATE drug_catalogue SET nhis_price = 116, updated_at = NOW() 
WHERE code = 'NHIA-03-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 116);
UPDATE drug_catalogue SET nhis_price = 2013, updated_at = NOW() 
WHERE code = 'NHIA-03-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2013);
UPDATE drug_catalogue SET nhis_price = 37, updated_at = NOW() 
WHERE code = 'NHIA-03-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 37);
UPDATE drug_catalogue SET nhis_price = 683, updated_at = NOW() 
WHERE code = 'NHIA-03-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 683);
UPDATE drug_catalogue SET nhis_price = 85, updated_at = NOW() 
WHERE code = 'NHIA-03-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 85);
UPDATE drug_catalogue SET nhis_price = 67, updated_at = NOW() 
WHERE code = 'NHIA-03-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 67);
UPDATE drug_catalogue SET nhis_price = 1046, updated_at = NOW() 
WHERE code = 'NHIA-03-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1046);
UPDATE drug_catalogue SET nhis_price = 50, updated_at = NOW() 
WHERE code = 'NHIA-03-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 50);
UPDATE drug_catalogue SET nhis_price = 1100, updated_at = NOW() 
WHERE code = 'NHIA-03-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1100);
UPDATE drug_catalogue SET nhis_price = 10, updated_at = NOW() 
WHERE code = 'NHIA-03-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10);
UPDATE drug_catalogue SET nhis_price = 670, updated_at = NOW() 
WHERE code = 'NHIA-03-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 670);
UPDATE drug_catalogue SET nhis_price = 85, updated_at = NOW() 
WHERE code = 'NHIA-03-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 85);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-03-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 165, updated_at = NOW() 
WHERE code = 'NHIA-03-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 165);
UPDATE drug_catalogue SET nhis_price = 217, updated_at = NOW() 
WHERE code = 'NHIA-03-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 217);
UPDATE drug_catalogue SET nhis_price = 200, updated_at = NOW() 
WHERE code = 'NHIA-03-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 200);
UPDATE drug_catalogue SET nhis_price = 650, updated_at = NOW() 
WHERE code = 'NHIA-03-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 650);
UPDATE drug_catalogue SET nhis_price = 793, updated_at = NOW() 
WHERE code = 'NHIA-03-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 793);
UPDATE drug_catalogue SET nhis_price = 800, updated_at = NOW() 
WHERE code = 'NHIA-03-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 800);
UPDATE drug_catalogue SET nhis_price = 440, updated_at = NOW() 
WHERE code = 'NHIA-04-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 440);
UPDATE drug_catalogue SET nhis_price = 970, updated_at = NOW() 
WHERE code = 'NHIA-04-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 970);
UPDATE drug_catalogue SET nhis_price = 5620, updated_at = NOW() 
WHERE code = 'NHIA-04-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5620);
UPDATE drug_catalogue SET nhis_price = 1398, updated_at = NOW() 
WHERE code = 'NHIA-04-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1398);
UPDATE drug_catalogue SET nhis_price = 1117, updated_at = NOW() 
WHERE code = 'NHIA-04-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1117);
UPDATE drug_catalogue SET nhis_price = 5048, updated_at = NOW() 
WHERE code = 'NHIA-04-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5048);
UPDATE drug_catalogue SET nhis_price = 3900, updated_at = NOW() 
WHERE code = 'NHIA-04-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3900);
UPDATE drug_catalogue SET nhis_price = 1093, updated_at = NOW() 
WHERE code = 'NHIA-04-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1093);
UPDATE drug_catalogue SET nhis_price = 2415, updated_at = NOW() 
WHERE code = 'NHIA-04-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2415);
UPDATE drug_catalogue SET nhis_price = 4819, updated_at = NOW() 
WHERE code = 'NHIA-04-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4819);
UPDATE drug_catalogue SET nhis_price = 1871, updated_at = NOW() 
WHERE code = 'NHIA-04-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1871);
UPDATE drug_catalogue SET nhis_price = 1738, updated_at = NOW() 
WHERE code = 'NHIA-04-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1738);
UPDATE drug_catalogue SET nhis_price = 1525, updated_at = NOW() 
WHERE code = 'NHIA-04-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1525);
UPDATE drug_catalogue SET nhis_price = 10004, updated_at = NOW() 
WHERE code = 'NHIA-04-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10004);
UPDATE drug_catalogue SET nhis_price = 404, updated_at = NOW() 
WHERE code = 'NHIA-04-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 404);
UPDATE drug_catalogue SET nhis_price = 247, updated_at = NOW() 
WHERE code = 'NHIA-04-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 247);
UPDATE drug_catalogue SET nhis_price = 1425, updated_at = NOW() 
WHERE code = 'NHIA-04-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1425);
UPDATE drug_catalogue SET nhis_price = 149, updated_at = NOW() 
WHERE code = 'NHIA-05-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 149);
UPDATE drug_catalogue SET nhis_price = 278, updated_at = NOW() 
WHERE code = 'NHIA-05-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 278);
UPDATE drug_catalogue SET nhis_price = 10546, updated_at = NOW() 
WHERE code = 'NHIA-05-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10546);
UPDATE drug_catalogue SET nhis_price = 800, updated_at = NOW() 
WHERE code = 'NHIA-05-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 800);
UPDATE drug_catalogue SET nhis_price = 393, updated_at = NOW() 
WHERE code = 'NHIA-05-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 393);
UPDATE drug_catalogue SET nhis_price = 3401, updated_at = NOW() 
WHERE code = 'NHIA-05-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3401);
UPDATE drug_catalogue SET nhis_price = 2989, updated_at = NOW() 
WHERE code = 'NHIA-05-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2989);
UPDATE drug_catalogue SET nhis_price = 1928, updated_at = NOW() 
WHERE code = 'NHIA-05-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1928);
UPDATE drug_catalogue SET nhis_price = 40, updated_at = NOW() 
WHERE code = 'NHIA-05-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 40);
UPDATE drug_catalogue SET nhis_price = 47, updated_at = NOW() 
WHERE code = 'NHIA-05-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 47);
UPDATE drug_catalogue SET nhis_price = 1406, updated_at = NOW() 
WHERE code = 'NHIA-05-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1406);
UPDATE drug_catalogue SET nhis_price = 6094, updated_at = NOW() 
WHERE code = 'NHIA-05-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6094);
UPDATE drug_catalogue SET nhis_price = 92, updated_at = NOW() 
WHERE code = 'NHIA-05-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 92);
UPDATE drug_catalogue SET nhis_price = 174, updated_at = NOW() 
WHERE code = 'NHIA-05-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 174);
UPDATE drug_catalogue SET nhis_price = 354, updated_at = NOW() 
WHERE code = 'NHIA-05-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 354);
UPDATE drug_catalogue SET nhis_price = 11000, updated_at = NOW() 
WHERE code = 'NHIA-05-01-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11000);
UPDATE drug_catalogue SET nhis_price = 228, updated_at = NOW() 
WHERE code = 'NHIA-05-01-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 228);
UPDATE drug_catalogue SET nhis_price = 364, updated_at = NOW() 
WHERE code = 'NHIA-05-01-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 364);
UPDATE drug_catalogue SET nhis_price = 343, updated_at = NOW() 
WHERE code = 'NHIA-05-01-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 343);
UPDATE drug_catalogue SET nhis_price = 12, updated_at = NOW() 
WHERE code = 'NHIA-06-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12);
UPDATE drug_catalogue SET nhis_price = 23, updated_at = NOW() 
WHERE code = 'NHIA-06-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 23);
UPDATE drug_catalogue SET nhis_price = 632, updated_at = NOW() 
WHERE code = 'NHIA-06-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 632);
UPDATE drug_catalogue SET nhis_price = 732, updated_at = NOW() 
WHERE code = 'NHIA-06-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 732);
UPDATE drug_catalogue SET nhis_price = 453, updated_at = NOW() 
WHERE code = 'NHIA-06-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 453);
UPDATE drug_catalogue SET nhis_price = 847, updated_at = NOW() 
WHERE code = 'NHIA-06-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 847);
UPDATE drug_catalogue SET nhis_price = 311, updated_at = NOW() 
WHERE code = 'NHIA-06-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 311);
UPDATE drug_catalogue SET nhis_price = 365, updated_at = NOW() 
WHERE code = 'NHIA-06-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 365);
UPDATE drug_catalogue SET nhis_price = 700, updated_at = NOW() 
WHERE code = 'NHIA-06-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 700);
UPDATE drug_catalogue SET nhis_price = 127, updated_at = NOW() 
WHERE code = 'NHIA-06-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 127);
UPDATE drug_catalogue SET nhis_price = 374, updated_at = NOW() 
WHERE code = 'NHIA-06-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 374);
UPDATE drug_catalogue SET nhis_price = 564, updated_at = NOW() 
WHERE code = 'NHIA-06-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 564);
UPDATE drug_catalogue SET nhis_price = 777, updated_at = NOW() 
WHERE code = 'NHIA-06-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 777);
UPDATE drug_catalogue SET nhis_price = 541, updated_at = NOW() 
WHERE code = 'NHIA-06-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 541);
UPDATE drug_catalogue SET nhis_price = 746, updated_at = NOW() 
WHERE code = 'NHIA-06-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 746);
UPDATE drug_catalogue SET nhis_price = 760, updated_at = NOW() 
WHERE code = 'NHIA-06-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 760);
UPDATE drug_catalogue SET nhis_price = 145, updated_at = NOW() 
WHERE code = 'NHIA-06-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 145);
UPDATE drug_catalogue SET nhis_price = 54, updated_at = NOW() 
WHERE code = 'NHIA-06-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 54);
UPDATE drug_catalogue SET nhis_price = 61, updated_at = NOW() 
WHERE code = 'NHIA-06-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 61);
UPDATE drug_catalogue SET nhis_price = 2500, updated_at = NOW() 
WHERE code = 'NHIA-06-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2500);
UPDATE drug_catalogue SET nhis_price = 2000, updated_at = NOW() 
WHERE code = 'NHIA-06-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2000);
UPDATE drug_catalogue SET nhis_price = 1037, updated_at = NOW() 
WHERE code = 'NHIA-06-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1037);
UPDATE drug_catalogue SET nhis_price = 1084, updated_at = NOW() 
WHERE code = 'NHIA-06-05-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1084);
UPDATE drug_catalogue SET nhis_price = 1049, updated_at = NOW() 
WHERE code = 'NHIA-06-05-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1049);
UPDATE drug_catalogue SET nhis_price = 1684, updated_at = NOW() 
WHERE code = 'NHIA-06-05-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1684);
UPDATE drug_catalogue SET nhis_price = 1487, updated_at = NOW() 
WHERE code = 'NHIA-06-05-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1487);
UPDATE drug_catalogue SET nhis_price = 2391, updated_at = NOW() 
WHERE code = 'NHIA-06-05-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2391);
UPDATE drug_catalogue SET nhis_price = 1130, updated_at = NOW() 
WHERE code = 'NHIA-06-05-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1130);
UPDATE drug_catalogue SET nhis_price = 1964, updated_at = NOW() 
WHERE code = 'NHIA-06-05-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1964);
UPDATE drug_catalogue SET nhis_price = 1879, updated_at = NOW() 
WHERE code = 'NHIA-06-05-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1879);
UPDATE drug_catalogue SET nhis_price = 878, updated_at = NOW() 
WHERE code = 'NHIA-06-05-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 878);
UPDATE drug_catalogue SET nhis_price = 1025, updated_at = NOW() 
WHERE code = 'NHIA-06-05-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1025);
UPDATE drug_catalogue SET nhis_price = 1586, updated_at = NOW() 
WHERE code = 'NHIA-06-05-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1586);
UPDATE drug_catalogue SET nhis_price = 1515, updated_at = NOW() 
WHERE code = 'NHIA-06-05-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1515);
UPDATE drug_catalogue SET nhis_price = 1716, updated_at = NOW() 
WHERE code = 'NHIA-06-05-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1716);
UPDATE drug_catalogue SET nhis_price = 1871, updated_at = NOW() 
WHERE code = 'NHIA-06-05-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1871);
UPDATE drug_catalogue SET nhis_price = 1298, updated_at = NOW() 
WHERE code = 'NHIA-06-05-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1298);
UPDATE drug_catalogue SET nhis_price = 3273, updated_at = NOW() 
WHERE code = 'NHIA-06-05-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3273);
UPDATE drug_catalogue SET nhis_price = 2462, updated_at = NOW() 
WHERE code = 'NHIA-06-05-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2462);
UPDATE drug_catalogue SET nhis_price = 514, updated_at = NOW() 
WHERE code = 'NHIA-06-05-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 514);
UPDATE drug_catalogue SET nhis_price = 340, updated_at = NOW() 
WHERE code = 'NHIA-06-05-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 340);
UPDATE drug_catalogue SET nhis_price = 1068, updated_at = NOW() 
WHERE code = 'NHIA-06-05-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1068);
UPDATE drug_catalogue SET nhis_price = 1661, updated_at = NOW() 
WHERE code = 'NHIA-06-05-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1661);
UPDATE drug_catalogue SET nhis_price = 1686, updated_at = NOW() 
WHERE code = 'NHIA-06-05-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1686);
UPDATE drug_catalogue SET nhis_price = 1903, updated_at = NOW() 
WHERE code = 'NHIA-06-05-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1903);
UPDATE drug_catalogue SET nhis_price = 3001, updated_at = NOW() 
WHERE code = 'NHIA-06-05-27' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3001);
UPDATE drug_catalogue SET nhis_price = 140, updated_at = NOW() 
WHERE code = 'NHIA-06-05-28' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 140);
UPDATE drug_catalogue SET nhis_price = 756, updated_at = NOW() 
WHERE code = 'NHIA-06-05-29' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 756);
UPDATE drug_catalogue SET nhis_price = 33, updated_at = NOW() 
WHERE code = 'NHIA-06-05-30' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 33);
UPDATE drug_catalogue SET nhis_price = 262, updated_at = NOW() 
WHERE code = 'NHIA-06-05-31' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 262);
UPDATE drug_catalogue SET nhis_price = 451, updated_at = NOW() 
WHERE code = 'NHIA-06-05-32' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 451);
UPDATE drug_catalogue SET nhis_price = 2330, updated_at = NOW() 
WHERE code = 'NHIA-06-05-33' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2330);
UPDATE drug_catalogue SET nhis_price = 2367, updated_at = NOW() 
WHERE code = 'NHIA-06-06-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2367);
UPDATE drug_catalogue SET nhis_price = 2391, updated_at = NOW() 
WHERE code = 'NHIA-06-06-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2391);
UPDATE drug_catalogue SET nhis_price = 2147, updated_at = NOW() 
WHERE code = 'NHIA-06-06-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2147);
UPDATE drug_catalogue SET nhis_price = 2367, updated_at = NOW() 
WHERE code = 'NHIA-06-06-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2367);
UPDATE drug_catalogue SET nhis_price = 2342, updated_at = NOW() 
WHERE code = 'NHIA-06-06-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2342);
UPDATE drug_catalogue SET nhis_price = 2318, updated_at = NOW() 
WHERE code = 'NHIA-06-06-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2318);
UPDATE drug_catalogue SET nhis_price = 1537, updated_at = NOW() 
WHERE code = 'NHIA-06-07-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1537);
UPDATE drug_catalogue SET nhis_price = 101, updated_at = NOW() 
WHERE code = 'NHIA-06-07-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 101);
UPDATE drug_catalogue SET nhis_price = 120, updated_at = NOW() 
WHERE code = 'NHIA-06-07-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 120);
UPDATE drug_catalogue SET nhis_price = 1500, updated_at = NOW() 
WHERE code = 'NHIA-06-07-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1500);
UPDATE drug_catalogue SET nhis_price = 1098, updated_at = NOW() 
WHERE code = 'NHIA-06-07-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1098);
UPDATE drug_catalogue SET nhis_price = 153, updated_at = NOW() 
WHERE code = 'NHIA-06-07-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 153);
UPDATE drug_catalogue SET nhis_price = 295, updated_at = NOW() 
WHERE code = 'NHIA-06-07-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 295);
UPDATE drug_catalogue SET nhis_price = 349, updated_at = NOW() 
WHERE code = 'NHIA-06-07-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 349);
UPDATE drug_catalogue SET nhis_price = 3022, updated_at = NOW() 
WHERE code = 'NHIA-06-07-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3022);
UPDATE drug_catalogue SET nhis_price = 4172, updated_at = NOW() 
WHERE code = 'NHIA-06-07-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4172);
UPDATE drug_catalogue SET nhis_price = 3013, updated_at = NOW() 
WHERE code = 'NHIA-06-07-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3013);
UPDATE drug_catalogue SET nhis_price = 3587, updated_at = NOW() 
WHERE code = 'NHIA-06-07-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3587);
UPDATE drug_catalogue SET nhis_price = 189, updated_at = NOW() 
WHERE code = 'NHIA-06-07-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 189);
UPDATE drug_catalogue SET nhis_price = 1200, updated_at = NOW() 
WHERE code = 'NHIA-06-07-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1200);
UPDATE drug_catalogue SET nhis_price = 2031, updated_at = NOW() 
WHERE code = 'NHIA-06-07-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2031);
UPDATE drug_catalogue SET nhis_price = 796, updated_at = NOW() 
WHERE code = 'NHIA-06-07-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 796);
UPDATE drug_catalogue SET nhis_price = 488, updated_at = NOW() 
WHERE code = 'NHIA-06-07-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 488);
UPDATE drug_catalogue SET nhis_price = 2051, updated_at = NOW() 
WHERE code = 'NHIA-06-07-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2051);
UPDATE drug_catalogue SET nhis_price = 2199, updated_at = NOW() 
WHERE code = 'NHIA-06-07-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2199);
UPDATE drug_catalogue SET nhis_price = 683, updated_at = NOW() 
WHERE code = 'NHIA-06-07-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 683);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-06-07-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 470, updated_at = NOW() 
WHERE code = 'NHIA-06-07-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 470);
UPDATE drug_catalogue SET nhis_price = 1500, updated_at = NOW() 
WHERE code = 'NHIA-06-07-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1500);
UPDATE drug_catalogue SET nhis_price = 1403, updated_at = NOW() 
WHERE code = 'NHIA-06-07-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1403);
UPDATE drug_catalogue SET nhis_price = 600, updated_at = NOW() 
WHERE code = 'NHIA-06-07-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 600);
UPDATE drug_catalogue SET nhis_price = 308, updated_at = NOW() 
WHERE code = 'NHIA-06-07-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 308);
UPDATE drug_catalogue SET nhis_price = 390, updated_at = NOW() 
WHERE code = 'NHIA-06-07-27' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 390);
UPDATE drug_catalogue SET nhis_price = 537, updated_at = NOW() 
WHERE code = 'NHIA-06-07-28' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 537);
UPDATE drug_catalogue SET nhis_price = 2904, updated_at = NOW() 
WHERE code = 'NHIA-06-07-29' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2904);
UPDATE drug_catalogue SET nhis_price = 342, updated_at = NOW() 
WHERE code = 'NHIA-06-07-30' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 342);
UPDATE drug_catalogue SET nhis_price = 2635, updated_at = NOW() 
WHERE code = 'NHIA-06-07-31' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2635);
UPDATE drug_catalogue SET nhis_price = 464, updated_at = NOW() 
WHERE code = 'NHIA-06-07-32' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 464);
UPDATE drug_catalogue SET nhis_price = 622, updated_at = NOW() 
WHERE code = 'NHIA-06-07-33' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 622);
UPDATE drug_catalogue SET nhis_price = 4709, updated_at = NOW() 
WHERE code = 'NHIA-06-07-34' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4709);
UPDATE drug_catalogue SET nhis_price = 3318, updated_at = NOW() 
WHERE code = 'NHIA-06-07-35' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3318);
UPDATE drug_catalogue SET nhis_price = 1036, updated_at = NOW() 
WHERE code = 'NHIA-06-07-36' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1036);
UPDATE drug_catalogue SET nhis_price = 1059, updated_at = NOW() 
WHERE code = 'NHIA-06-07-37' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1059);
UPDATE drug_catalogue SET nhis_price = 2123, updated_at = NOW() 
WHERE code = 'NHIA-06-07-38' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2123);
UPDATE drug_catalogue SET nhis_price = 4648, updated_at = NOW() 
WHERE code = 'NHIA-06-07-39' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4648);
UPDATE drug_catalogue SET nhis_price = 348, updated_at = NOW() 
WHERE code = 'NHIA-06-07-40' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 348);
UPDATE drug_catalogue SET nhis_price = 543, updated_at = NOW() 
WHERE code = 'NHIA-06-07-41' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 543);
UPDATE drug_catalogue SET nhis_price = 2635, updated_at = NOW() 
WHERE code = 'NHIA-06-07-42' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2635);
UPDATE drug_catalogue SET nhis_price = 1122, updated_at = NOW() 
WHERE code = 'NHIA-06-07-43' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1122);
UPDATE drug_catalogue SET nhis_price = 521, updated_at = NOW() 
WHERE code = 'NHIA-06-07-44' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 521);
UPDATE drug_catalogue SET nhis_price = 137, updated_at = NOW() 
WHERE code = 'NHIA-06-07-45' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 137);
UPDATE drug_catalogue SET nhis_price = 1574, updated_at = NOW() 
WHERE code = 'NHIA-06-07-46' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1574);
UPDATE drug_catalogue SET nhis_price = 1649, updated_at = NOW() 
WHERE code = 'NHIA-06-07-47' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1649);
UPDATE drug_catalogue SET nhis_price = 2, updated_at = NOW() 
WHERE code = 'NHIA-06-07-48' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2);
UPDATE drug_catalogue SET nhis_price = 803, updated_at = NOW() 
WHERE code = 'NHIA-06-07-49' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 803);
UPDATE drug_catalogue SET nhis_price = 602, updated_at = NOW() 
WHERE code = 'NHIA-06-07-50' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 602);
UPDATE drug_catalogue SET nhis_price = 116, updated_at = NOW() 
WHERE code = 'NHIA-06-07-51' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 116);
UPDATE drug_catalogue SET nhis_price = 171, updated_at = NOW() 
WHERE code = 'NHIA-06-07-52' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 171);
UPDATE drug_catalogue SET nhis_price = 866, updated_at = NOW() 
WHERE code = 'NHIA-06-07-53' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 866);
UPDATE drug_catalogue SET nhis_price = 243, updated_at = NOW() 
WHERE code = 'NHIA-06-07-54' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 243);
UPDATE drug_catalogue SET nhis_price = 410, updated_at = NOW() 
WHERE code = 'NHIA-06-07-55' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 410);
UPDATE drug_catalogue SET nhis_price = 1526, updated_at = NOW() 
WHERE code = 'NHIA-06-07-56' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1526);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-06-07-57' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 2300, updated_at = NOW() 
WHERE code = 'NHIA-06-07-58' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2300);
UPDATE drug_catalogue SET nhis_price = 439, updated_at = NOW() 
WHERE code = 'NHIA-06-07-59' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 439);
UPDATE drug_catalogue SET nhis_price = 182, updated_at = NOW() 
WHERE code = 'NHIA-06-07-60' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 182);
UPDATE drug_catalogue SET nhis_price = 192, updated_at = NOW() 
WHERE code = 'NHIA-06-07-61' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 192);
UPDATE drug_catalogue SET nhis_price = 63, updated_at = NOW() 
WHERE code = 'NHIA-06-07-62' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 63);
UPDATE drug_catalogue SET nhis_price = 563, updated_at = NOW() 
WHERE code = 'NHIA-06-07-63' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 563);
UPDATE drug_catalogue SET nhis_price = 37, updated_at = NOW() 
WHERE code = 'NHIA-06-07-64' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 37);
UPDATE drug_catalogue SET nhis_price = 55, updated_at = NOW() 
WHERE code = 'NHIA-06-07-65' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 55);
UPDATE drug_catalogue SET nhis_price = 1171, updated_at = NOW() 
WHERE code = 'NHIA-06-07-66' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1171);
UPDATE drug_catalogue SET nhis_price = 195, updated_at = NOW() 
WHERE code = 'NHIA-06-07-67' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 195);
UPDATE drug_catalogue SET nhis_price = 116, updated_at = NOW() 
WHERE code = 'NHIA-06-07-68' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 116);
UPDATE drug_catalogue SET nhis_price = 201, updated_at = NOW() 
WHERE code = 'NHIA-06-07-69' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 201);
UPDATE drug_catalogue SET nhis_price = 966, updated_at = NOW() 
WHERE code = 'NHIA-06-07-70' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 966);
UPDATE drug_catalogue SET nhis_price = 89, updated_at = NOW() 
WHERE code = 'NHIA-06-07-71' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 89);
UPDATE drug_catalogue SET nhis_price = 146, updated_at = NOW() 
WHERE code = 'NHIA-06-07-72' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 146);
UPDATE drug_catalogue SET nhis_price = 10919, updated_at = NOW() 
WHERE code = 'NHIA-06-07-73' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10919);
UPDATE drug_catalogue SET nhis_price = 156, updated_at = NOW() 
WHERE code = 'NHIA-06-07-74' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 156);
UPDATE drug_catalogue SET nhis_price = 136, updated_at = NOW() 
WHERE code = 'NHIA-06-07-75' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 136);
UPDATE drug_catalogue SET nhis_price = 207, updated_at = NOW() 
WHERE code = 'NHIA-06-07-76' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 207);
UPDATE drug_catalogue SET nhis_price = 140, updated_at = NOW() 
WHERE code = 'NHIA-06-07-77' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 140);
UPDATE drug_catalogue SET nhis_price = 1793, updated_at = NOW() 
WHERE code = 'NHIA-06-07-78' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1793);
UPDATE drug_catalogue SET nhis_price = 598, updated_at = NOW() 
WHERE code = 'NHIA-06-07-79' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 598);
UPDATE drug_catalogue SET nhis_price = 2898, updated_at = NOW() 
WHERE code = 'NHIA-06-07-80' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2898);
UPDATE drug_catalogue SET nhis_price = 409, updated_at = NOW() 
WHERE code = 'NHIA-06-07-81' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 409);
UPDATE drug_catalogue SET nhis_price = 79, updated_at = NOW() 
WHERE code = 'NHIA-06-07-82' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 79);
UPDATE drug_catalogue SET nhis_price = 95, updated_at = NOW() 
WHERE code = 'NHIA-06-07-83' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 95);
UPDATE drug_catalogue SET nhis_price = 952, updated_at = NOW() 
WHERE code = 'NHIA-06-07-84' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 952);
UPDATE drug_catalogue SET nhis_price = 756, updated_at = NOW() 
WHERE code = 'NHIA-06-07-85' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 756);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-06-07-86' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 551, updated_at = NOW() 
WHERE code = 'NHIA-06-07-87' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 551);
UPDATE drug_catalogue SET nhis_price = 3217, updated_at = NOW() 
WHERE code = 'NHIA-06-07-88' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3217);
UPDATE drug_catalogue SET nhis_price = 1913, updated_at = NOW() 
WHERE code = 'NHIA-06-07-89' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1913);
UPDATE drug_catalogue SET nhis_price = 22, updated_at = NOW() 
WHERE code = 'NHIA-06-07-90' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 22);
UPDATE drug_catalogue SET nhis_price = 94, updated_at = NOW() 
WHERE code = 'NHIA-06-07-91' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 94);
UPDATE drug_catalogue SET nhis_price = 141, updated_at = NOW() 
WHERE code = 'NHIA-06-07-92' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 141);
UPDATE drug_catalogue SET nhis_price = 212, updated_at = NOW() 
WHERE code = 'NHIA-06-07-93' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 212);
UPDATE drug_catalogue SET nhis_price = 838, updated_at = NOW() 
WHERE code = 'NHIA-06-07-94' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 838);
UPDATE drug_catalogue SET nhis_price = 306, updated_at = NOW() 
WHERE code = 'NHIA-06-07-95' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 306);
UPDATE drug_catalogue SET nhis_price = 98, updated_at = NOW() 
WHERE code = 'NHIA-06-07-96' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 98);
UPDATE drug_catalogue SET nhis_price = 447, updated_at = NOW() 
WHERE code = 'NHIA-06-07-97' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 447);
UPDATE drug_catalogue SET nhis_price = 6545, updated_at = NOW() 
WHERE code = 'NHIA-06-07-98' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6545);
UPDATE drug_catalogue SET nhis_price = 134, updated_at = NOW() 
WHERE code = 'NHIA-06-07-99' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 134);
UPDATE drug_catalogue SET nhis_price = 174, updated_at = NOW() 
WHERE code = 'NHIA-06-08-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 174);
UPDATE drug_catalogue SET nhis_price = 73, updated_at = NOW() 
WHERE code = 'NHIA-06-08-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 73);
UPDATE drug_catalogue SET nhis_price = 84, updated_at = NOW() 
WHERE code = 'NHIA-06-08-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 84);
UPDATE drug_catalogue SET nhis_price = 60, updated_at = NOW() 
WHERE code = 'NHIA-06-08-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 60);
UPDATE drug_catalogue SET nhis_price = 8229, updated_at = NOW() 
WHERE code = 'NHIA-06-09-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8229);
UPDATE drug_catalogue SET nhis_price = 164, updated_at = NOW() 
WHERE code = 'NHIA-06-09-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 164);
UPDATE drug_catalogue SET nhis_price = 188, updated_at = NOW() 
WHERE code = 'NHIA-06-09-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 188);
UPDATE drug_catalogue SET nhis_price = 459, updated_at = NOW() 
WHERE code = 'NHIA-06-09-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 459);
UPDATE drug_catalogue SET nhis_price = 1770, updated_at = NOW() 
WHERE code = 'NHIA-06-09-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1770);
UPDATE drug_catalogue SET nhis_price = 798, updated_at = NOW() 
WHERE code = 'NHIA-06-09-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 798);
UPDATE drug_catalogue SET nhis_price = 135, updated_at = NOW() 
WHERE code = 'NHIA-06-09-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 135);
UPDATE drug_catalogue SET nhis_price = 1091, updated_at = NOW() 
WHERE code = 'NHIA-06-09-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1091);
UPDATE drug_catalogue SET nhis_price = 412, updated_at = NOW() 
WHERE code = 'NHIA-06-09-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 412);
UPDATE drug_catalogue SET nhis_price = 878, updated_at = NOW() 
WHERE code = 'NHIA-06-09-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 878);
UPDATE drug_catalogue SET nhis_price = 87, updated_at = NOW() 
WHERE code = 'NHIA-06-09-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 87);
UPDATE drug_catalogue SET nhis_price = 952, updated_at = NOW() 
WHERE code = 'NHIA-06-09-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 952);
UPDATE drug_catalogue SET nhis_price = 137, updated_at = NOW() 
WHERE code = 'NHIA-06-09-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 137);
UPDATE drug_catalogue SET nhis_price = 192, updated_at = NOW() 
WHERE code = 'NHIA-06-09-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 192);
UPDATE drug_catalogue SET nhis_price = 269, updated_at = NOW() 
WHERE code = 'NHIA-06-09-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 269);
UPDATE drug_catalogue SET nhis_price = 234, updated_at = NOW() 
WHERE code = 'NHIA-06-10-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 234);
UPDATE drug_catalogue SET nhis_price = 355, updated_at = NOW() 
WHERE code = 'NHIA-06-10-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 355);
UPDATE drug_catalogue SET nhis_price = 1383, updated_at = NOW() 
WHERE code = 'NHIA-06-10-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1383);
UPDATE drug_catalogue SET nhis_price = 1471, updated_at = NOW() 
WHERE code = 'NHIA-06-10-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1471);
UPDATE drug_catalogue SET nhis_price = 415, updated_at = NOW() 
WHERE code = 'NHIA-06-10-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 415);
UPDATE drug_catalogue SET nhis_price = 588, updated_at = NOW() 
WHERE code = 'NHIA-06-10-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 588);
UPDATE drug_catalogue SET nhis_price = 136, updated_at = NOW() 
WHERE code = 'NHIA-06-10-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 136);
UPDATE drug_catalogue SET nhis_price = 2798, updated_at = NOW() 
WHERE code = 'NHIA-06-10-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2798);
UPDATE drug_catalogue SET nhis_price = 3880, updated_at = NOW() 
WHERE code = 'NHIA-06-10-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3880);
UPDATE drug_catalogue SET nhis_price = 5789, updated_at = NOW() 
WHERE code = 'NHIA-06-10-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5789);
UPDATE drug_catalogue SET nhis_price = 2837, updated_at = NOW() 
WHERE code = 'NHIA-06-10-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2837);
UPDATE drug_catalogue SET nhis_price = 848, updated_at = NOW() 
WHERE code = 'NHIA-06-10-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 848);
UPDATE drug_catalogue SET nhis_price = 99999999, updated_at = NOW() 
WHERE code = 'NHIA-06-11-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 99999999);
UPDATE drug_catalogue SET nhis_price = 250, updated_at = NOW() 
WHERE code = 'NHIA-06-11-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 250);
UPDATE drug_catalogue SET nhis_price = 200, updated_at = NOW() 
WHERE code = 'NHIA-06-11-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 200);
UPDATE drug_catalogue SET nhis_price = 488, updated_at = NOW() 
WHERE code = 'NHIA-06-11-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 488);
UPDATE drug_catalogue SET nhis_price = 136, updated_at = NOW() 
WHERE code = 'NHIA-06-11-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 136);
UPDATE drug_catalogue SET nhis_price = 2798, updated_at = NOW() 
WHERE code = 'NHIA-06-11-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2798);
UPDATE drug_catalogue SET nhis_price = 501, updated_at = NOW() 
WHERE code = 'NHIA-06-11-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 501);
UPDATE drug_catalogue SET nhis_price = 250, updated_at = NOW() 
WHERE code = 'NHIA-06-11-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 250);
UPDATE drug_catalogue SET nhis_price = 512, updated_at = NOW() 
WHERE code = 'NHIA-06-11-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 512);
UPDATE drug_catalogue SET nhis_price = 300, updated_at = NOW() 
WHERE code = 'NHIA-06-11-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 300);
UPDATE drug_catalogue SET nhis_price = 1005, updated_at = NOW() 
WHERE code = 'NHIA-06-11-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1005);
UPDATE drug_catalogue SET nhis_price = 504, updated_at = NOW() 
WHERE code = 'NHIA-06-11-30' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 504);
UPDATE drug_catalogue SET nhis_price = 6832, updated_at = NOW() 
WHERE code = 'NHIA-06-11-31' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6832);
UPDATE drug_catalogue SET nhis_price = 302, updated_at = NOW() 
WHERE code = 'NHIA-06-11-32' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 302);
UPDATE drug_catalogue SET nhis_price = 854, updated_at = NOW() 
WHERE code = 'NHIA-06-11-36' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 854);
UPDATE drug_catalogue SET nhis_price = 4880, updated_at = NOW() 
WHERE code = 'NHIA-06-11-38' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4880);
UPDATE drug_catalogue SET nhis_price = 4148, updated_at = NOW() 
WHERE code = 'NHIA-06-11-39' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4148);
UPDATE drug_catalogue SET nhis_price = 4880, updated_at = NOW() 
WHERE code = 'NHIA-06-11-40' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4880);
UPDATE drug_catalogue SET nhis_price = 2196, updated_at = NOW() 
WHERE code = 'NHIA-06-11-41' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2196);
UPDATE drug_catalogue SET nhis_price = 115, updated_at = NOW() 
WHERE code = 'NHIA-07-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 115);
UPDATE drug_catalogue SET nhis_price = 188, updated_at = NOW() 
WHERE code = 'NHIA-07-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 188);
UPDATE drug_catalogue SET nhis_price = 142, updated_at = NOW() 
WHERE code = 'NHIA-07-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 142);
UPDATE drug_catalogue SET nhis_price = 4677, updated_at = NOW() 
WHERE code = 'NHIA-07-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4677);
UPDATE drug_catalogue SET nhis_price = 55, updated_at = NOW() 
WHERE code = 'NHIA-07-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 55);
UPDATE drug_catalogue SET nhis_price = 189, updated_at = NOW() 
WHERE code = 'NHIA-08-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 189);
UPDATE drug_catalogue SET nhis_price = 169, updated_at = NOW() 
WHERE code = 'NHIA-08-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 169);
UPDATE drug_catalogue SET nhis_price = 55, updated_at = NOW() 
WHERE code = 'NHIA-08-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 55);
UPDATE drug_catalogue SET nhis_price = 116, updated_at = NOW() 
WHERE code = 'NHIA-08-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 116);
UPDATE drug_catalogue SET nhis_price = 143, updated_at = NOW() 
WHERE code = 'NHIA-08-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 143);
UPDATE drug_catalogue SET nhis_price = 1034, updated_at = NOW() 
WHERE code = 'NHIA-08-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1034);
UPDATE drug_catalogue SET nhis_price = 18, updated_at = NOW() 
WHERE code = 'NHIA-08-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 18);
UPDATE drug_catalogue SET nhis_price = 12, updated_at = NOW() 
WHERE code = 'NHIA-09-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12);
UPDATE drug_catalogue SET nhis_price = 16, updated_at = NOW() 
WHERE code = 'NHIA-09-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 16);
UPDATE drug_catalogue SET nhis_price = 12, updated_at = NOW() 
WHERE code = 'NHIA-09-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12);
UPDATE drug_catalogue SET nhis_price = 242, updated_at = NOW() 
WHERE code = 'NHIA-09-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 242);
UPDATE drug_catalogue SET nhis_price = 275, updated_at = NOW() 
WHERE code = 'NHIA-09-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 275);
UPDATE drug_catalogue SET nhis_price = 176, updated_at = NOW() 
WHERE code = 'NHIA-09-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 176);
UPDATE drug_catalogue SET nhis_price = 622, updated_at = NOW() 
WHERE code = 'NHIA-09-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 622);
UPDATE drug_catalogue SET nhis_price = 393, updated_at = NOW() 
WHERE code = 'NHIA-09-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 393);
UPDATE drug_catalogue SET nhis_price = 403, updated_at = NOW() 
WHERE code = 'NHIA-09-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 403);
UPDATE drug_catalogue SET nhis_price = 7700, updated_at = NOW() 
WHERE code = 'NHIA-09-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7700);
UPDATE drug_catalogue SET nhis_price = 11956, updated_at = NOW() 
WHERE code = 'NHIA-10-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11956);
UPDATE drug_catalogue SET nhis_price = 671, updated_at = NOW() 
WHERE code = 'NHIA-10-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 671);
UPDATE drug_catalogue SET nhis_price = 11956, updated_at = NOW() 
WHERE code = 'NHIA-10-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11956);
UPDATE drug_catalogue SET nhis_price = 4270, updated_at = NOW() 
WHERE code = 'NHIA-10-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4270);
UPDATE drug_catalogue SET nhis_price = 2166, updated_at = NOW() 
WHERE code = 'NHIA-10-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2166);
UPDATE drug_catalogue SET nhis_price = 727, updated_at = NOW() 
WHERE code = 'NHIA-10-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 727);
UPDATE drug_catalogue SET nhis_price = 721, updated_at = NOW() 
WHERE code = 'NHIA-10-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 721);
UPDATE drug_catalogue SET nhis_price = 721, updated_at = NOW() 
WHERE code = 'NHIA-10-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 721);
UPDATE drug_catalogue SET nhis_price = 466, updated_at = NOW() 
WHERE code = 'NHIA-10-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 466);
UPDATE drug_catalogue SET nhis_price = 1684, updated_at = NOW() 
WHERE code = 'NHIA-10-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1684);
UPDATE drug_catalogue SET nhis_price = 246, updated_at = NOW() 
WHERE code = 'NHIA-10-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 246);
UPDATE drug_catalogue SET nhis_price = 834, updated_at = NOW() 
WHERE code = 'NHIA-10-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 834);
UPDATE drug_catalogue SET nhis_price = 390, updated_at = NOW() 
WHERE code = 'NHIA-10-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 390);
UPDATE drug_catalogue SET nhis_price = 600, updated_at = NOW() 
WHERE code = 'NHIA-10-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 600);
UPDATE drug_catalogue SET nhis_price = 1074, updated_at = NOW() 
WHERE code = 'NHIA-10-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1074);
UPDATE drug_catalogue SET nhis_price = 622, updated_at = NOW() 
WHERE code = 'NHIA-10-01-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 622);
UPDATE drug_catalogue SET nhis_price = 3855, updated_at = NOW() 
WHERE code = 'NHIA-10-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3855);
UPDATE drug_catalogue SET nhis_price = 417, updated_at = NOW() 
WHERE code = 'NHIA-10-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 417);
UPDATE drug_catalogue SET nhis_price = 356, updated_at = NOW() 
WHERE code = 'NHIA-10-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 356);
UPDATE drug_catalogue SET nhis_price = 1450, updated_at = NOW() 
WHERE code = 'NHIA-10-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1450);
UPDATE drug_catalogue SET nhis_price = 290, updated_at = NOW() 
WHERE code = 'NHIA-10-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 290);
UPDATE drug_catalogue SET nhis_price = 292, updated_at = NOW() 
WHERE code = 'NHIA-10-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 292);
UPDATE drug_catalogue SET nhis_price = 291, updated_at = NOW() 
WHERE code = 'NHIA-10-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 291);
UPDATE drug_catalogue SET nhis_price = 200, updated_at = NOW() 
WHERE code = 'NHIA-10-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 200);
UPDATE drug_catalogue SET nhis_price = 2000, updated_at = NOW() 
WHERE code = 'NHIA-10-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2000);
UPDATE drug_catalogue SET nhis_price = 300, updated_at = NOW() 
WHERE code = 'NHIA-10-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 300);
UPDATE drug_catalogue SET nhis_price = 15, updated_at = NOW() 
WHERE code = 'NHIA-10-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15);
UPDATE drug_catalogue SET nhis_price = 15, updated_at = NOW() 
WHERE code = 'NHIA-10-02-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15);
UPDATE drug_catalogue SET nhis_price = 342, updated_at = NOW() 
WHERE code = 'NHIA-10-02-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 342);
UPDATE drug_catalogue SET nhis_price = 175, updated_at = NOW() 
WHERE code = 'NHIA-10-02-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 175);
UPDATE drug_catalogue SET nhis_price = 89, updated_at = NOW() 
WHERE code = 'NHIA-11-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 89);
UPDATE drug_catalogue SET nhis_price = 252, updated_at = NOW() 
WHERE code = 'NHIA-11-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 252);
UPDATE drug_catalogue SET nhis_price = 712, updated_at = NOW() 
WHERE code = 'NHIA-11-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 712);
UPDATE drug_catalogue SET nhis_price = 8, updated_at = NOW() 
WHERE code = 'NHIA-11-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8);
UPDATE drug_catalogue SET nhis_price = 8, updated_at = NOW() 
WHERE code = 'NHIA-11-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8);
UPDATE drug_catalogue SET nhis_price = 275, updated_at = NOW() 
WHERE code = 'NHIA-11-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 275);
UPDATE drug_catalogue SET nhis_price = 3538, updated_at = NOW() 
WHERE code = 'NHIA-11-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3538);
UPDATE drug_catalogue SET nhis_price = 18605, updated_at = NOW() 
WHERE code = 'NHIA-11-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 18605);
UPDATE drug_catalogue SET nhis_price = 7015, updated_at = NOW() 
WHERE code = 'NHIA-11-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7015);
UPDATE drug_catalogue SET nhis_price = 4249, updated_at = NOW() 
WHERE code = 'NHIA-11-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4249);
UPDATE drug_catalogue SET nhis_price = 4675, updated_at = NOW() 
WHERE code = 'NHIA-11-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4675);
UPDATE drug_catalogue SET nhis_price = 9638, updated_at = NOW() 
WHERE code = 'NHIA-11-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 9638);
UPDATE drug_catalogue SET nhis_price = 268, updated_at = NOW() 
WHERE code = 'NHIA-11-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 268);
UPDATE drug_catalogue SET nhis_price = 336, updated_at = NOW() 
WHERE code = 'NHIA-11-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 336);
UPDATE drug_catalogue SET nhis_price = 1440, updated_at = NOW() 
WHERE code = 'NHIA-11-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1440);
UPDATE drug_catalogue SET nhis_price = 11, updated_at = NOW() 
WHERE code = 'NHIA-11-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11);
UPDATE drug_catalogue SET nhis_price = 161, updated_at = NOW() 
WHERE code = 'NHIA-11-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 161);
UPDATE drug_catalogue SET nhis_price = 522, updated_at = NOW() 
WHERE code = 'NHIA-11-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 522);
UPDATE drug_catalogue SET nhis_price = 190, updated_at = NOW() 
WHERE code = 'NHIA-11-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 190);
UPDATE drug_catalogue SET nhis_price = 56, updated_at = NOW() 
WHERE code = 'NHIA-11-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 56);
UPDATE drug_catalogue SET nhis_price = 5880, updated_at = NOW() 
WHERE code = 'NHIA-11-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5880);
UPDATE drug_catalogue SET nhis_price = 1403, updated_at = NOW() 
WHERE code = 'NHIA-11-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1403);
UPDATE drug_catalogue SET nhis_price = 1985, updated_at = NOW() 
WHERE code = 'NHIA-11-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1985);
UPDATE drug_catalogue SET nhis_price = 218258, updated_at = NOW() 
WHERE code = 'NHIA-11-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 218258);
UPDATE drug_catalogue SET nhis_price = 27755, updated_at = NOW() 
WHERE code = 'NHIA-11-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 27755);
UPDATE drug_catalogue SET nhis_price = 115, updated_at = NOW() 
WHERE code = 'NHIA-12-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 115);
UPDATE drug_catalogue SET nhis_price = 119, updated_at = NOW() 
WHERE code = 'NHIA-12-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 119);
UPDATE drug_catalogue SET nhis_price = 94, updated_at = NOW() 
WHERE code = 'NHIA-12-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 94);
UPDATE drug_catalogue SET nhis_price = 174, updated_at = NOW() 
WHERE code = 'NHIA-12-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 174);
UPDATE drug_catalogue SET nhis_price = 304, updated_at = NOW() 
WHERE code = 'NHIA-12-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 304);
UPDATE drug_catalogue SET nhis_price = 41, updated_at = NOW() 
WHERE code = 'NHIA-12-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 41);
UPDATE drug_catalogue SET nhis_price = 158, updated_at = NOW() 
WHERE code = 'NHIA-12-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 158);
UPDATE drug_catalogue SET nhis_price = 72, updated_at = NOW() 
WHERE code = 'NHIA-12-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 72);
UPDATE drug_catalogue SET nhis_price = 2117, updated_at = NOW() 
WHERE code = 'NHIA-12-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2117);
UPDATE drug_catalogue SET nhis_price = 131, updated_at = NOW() 
WHERE code = 'NHIA-12-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 131);
UPDATE drug_catalogue SET nhis_price = 178, updated_at = NOW() 
WHERE code = 'NHIA-12-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 178);
UPDATE drug_catalogue SET nhis_price = 342, updated_at = NOW() 
WHERE code = 'NHIA-12-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 342);
UPDATE drug_catalogue SET nhis_price = 224, updated_at = NOW() 
WHERE code = 'NHIA-12-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 224);
UPDATE drug_catalogue SET nhis_price = 143, updated_at = NOW() 
WHERE code = 'NHIA-12-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 143);
UPDATE drug_catalogue SET nhis_price = 1598, updated_at = NOW() 
WHERE code = 'NHIA-12-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1598);
UPDATE drug_catalogue SET nhis_price = 569, updated_at = NOW() 
WHERE code = 'NHIA-12-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 569);
UPDATE drug_catalogue SET nhis_price = 185, updated_at = NOW() 
WHERE code = 'NHIA-12-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 185);
UPDATE drug_catalogue SET nhis_price = 625, updated_at = NOW() 
WHERE code = 'NHIA-12-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 625);
UPDATE drug_catalogue SET nhis_price = 93, updated_at = NOW() 
WHERE code = 'NHIA-12-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 93);
UPDATE drug_catalogue SET nhis_price = 540, updated_at = NOW() 
WHERE code = 'NHIA-12-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 540);
UPDATE drug_catalogue SET nhis_price = 36, updated_at = NOW() 
WHERE code = 'NHIA-12-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 36);
UPDATE drug_catalogue SET nhis_price = 36, updated_at = NOW() 
WHERE code = 'NHIA-12-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 36);
UPDATE drug_catalogue SET nhis_price = 29, updated_at = NOW() 
WHERE code = 'NHIA-12-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 29);
UPDATE drug_catalogue SET nhis_price = 240, updated_at = NOW() 
WHERE code = 'NHIA-12-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 240);
UPDATE drug_catalogue SET nhis_price = 40, updated_at = NOW() 
WHERE code = 'NHIA-12-03-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 40);
UPDATE drug_catalogue SET nhis_price = 25, updated_at = NOW() 
WHERE code = 'NHIA-12-03-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 25);
UPDATE drug_catalogue SET nhis_price = 86, updated_at = NOW() 
WHERE code = 'NHIA-12-03-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 86);
UPDATE drug_catalogue SET nhis_price = 88, updated_at = NOW() 
WHERE code = 'NHIA-12-03-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 88);
UPDATE drug_catalogue SET nhis_price = 154, updated_at = NOW() 
WHERE code = 'NHIA-12-03-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 154);
UPDATE drug_catalogue SET nhis_price = 616, updated_at = NOW() 
WHERE code = 'NHIA-12-03-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 616);
UPDATE drug_catalogue SET nhis_price = 131, updated_at = NOW() 
WHERE code = 'NHIA-12-03-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 131);
UPDATE drug_catalogue SET nhis_price = 83, updated_at = NOW() 
WHERE code = 'NHIA-12-03-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 83);
UPDATE drug_catalogue SET nhis_price = 1088, updated_at = NOW() 
WHERE code = 'NHIA-12-03-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1088);
UPDATE drug_catalogue SET nhis_price = 106, updated_at = NOW() 
WHERE code = 'NHIA-12-03-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 106);
UPDATE drug_catalogue SET nhis_price = 363, updated_at = NOW() 
WHERE code = 'NHIA-12-03-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 363);
UPDATE drug_catalogue SET nhis_price = 25, updated_at = NOW() 
WHERE code = 'NHIA-12-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 25);
UPDATE drug_catalogue SET nhis_price = 58, updated_at = NOW() 
WHERE code = 'NHIA-12-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 58);
UPDATE drug_catalogue SET nhis_price = 70, updated_at = NOW() 
WHERE code = 'NHIA-12-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 70);
UPDATE drug_catalogue SET nhis_price = 280, updated_at = NOW() 
WHERE code = 'NHIA-12-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 280);
UPDATE drug_catalogue SET nhis_price = 300, updated_at = NOW() 
WHERE code = 'NHIA-12-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 300);
UPDATE drug_catalogue SET nhis_price = 484, updated_at = NOW() 
WHERE code = 'NHIA-12-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 484);
UPDATE drug_catalogue SET nhis_price = 451, updated_at = NOW() 
WHERE code = 'NHIA-12-04-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 451);
UPDATE drug_catalogue SET nhis_price = 444, updated_at = NOW() 
WHERE code = 'NHIA-12-04-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 444);
UPDATE drug_catalogue SET nhis_price = 30, updated_at = NOW() 
WHERE code = 'NHIA-12-04-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 30);
UPDATE drug_catalogue SET nhis_price = 73, updated_at = NOW() 
WHERE code = 'NHIA-12-04-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 73);
UPDATE drug_catalogue SET nhis_price = 98, updated_at = NOW() 
WHERE code = 'NHIA-12-04-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 98);
UPDATE drug_catalogue SET nhis_price = 329, updated_at = NOW() 
WHERE code = 'NHIA-12-04-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 329);
UPDATE drug_catalogue SET nhis_price = 449, updated_at = NOW() 
WHERE code = 'NHIA-12-04-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 449);
UPDATE drug_catalogue SET nhis_price = 538, updated_at = NOW() 
WHERE code = 'NHIA-12-04-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 538);
UPDATE drug_catalogue SET nhis_price = 32, updated_at = NOW() 
WHERE code = 'NHIA-12-04-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 32);
UPDATE drug_catalogue SET nhis_price = 64, updated_at = NOW() 
WHERE code = 'NHIA-12-04-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 64);
UPDATE drug_catalogue SET nhis_price = 99, updated_at = NOW() 
WHERE code = 'NHIA-12-04-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 99);
UPDATE drug_catalogue SET nhis_price = 79, updated_at = NOW() 
WHERE code = 'NHIA-12-04-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 79);
UPDATE drug_catalogue SET nhis_price = 81, updated_at = NOW() 
WHERE code = 'NHIA-12-04-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 81);
UPDATE drug_catalogue SET nhis_price = 78, updated_at = NOW() 
WHERE code = 'NHIA-12-04-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 78);
UPDATE drug_catalogue SET nhis_price = 70, updated_at = NOW() 
WHERE code = 'NHIA-12-04-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 70);
UPDATE drug_catalogue SET nhis_price = 40, updated_at = NOW() 
WHERE code = 'NHIA-12-04-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 40);
UPDATE drug_catalogue SET nhis_price = 61, updated_at = NOW() 
WHERE code = 'NHIA-12-04-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 61);
UPDATE drug_catalogue SET nhis_price = 56, updated_at = NOW() 
WHERE code = 'NHIA-12-04-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 56);
UPDATE drug_catalogue SET nhis_price = 58, updated_at = NOW() 
WHERE code = 'NHIA-12-04-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 58);
UPDATE drug_catalogue SET nhis_price = 115, updated_at = NOW() 
WHERE code = 'NHIA-12-04-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 115);
UPDATE drug_catalogue SET nhis_price = 150, updated_at = NOW() 
WHERE code = 'NHIA-12-04-27' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 150);
UPDATE drug_catalogue SET nhis_price = 40, updated_at = NOW() 
WHERE code = 'NHIA-12-04-28' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 40);
UPDATE drug_catalogue SET nhis_price = 47, updated_at = NOW() 
WHERE code = 'NHIA-12-04-29' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 47);
UPDATE drug_catalogue SET nhis_price = 1177, updated_at = NOW() 
WHERE code = 'NHIA-12-04-30' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1177);
UPDATE drug_catalogue SET nhis_price = 310, updated_at = NOW() 
WHERE code = 'NHIA-12-04-31' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 310);
UPDATE drug_catalogue SET nhis_price = 411, updated_at = NOW() 
WHERE code = 'NHIA-12-04-32' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 411);
UPDATE drug_catalogue SET nhis_price = 542, updated_at = NOW() 
WHERE code = 'NHIA-12-04-33' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 542);
UPDATE drug_catalogue SET nhis_price = 448, updated_at = NOW() 
WHERE code = 'NHIA-12-04-34' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 448);
UPDATE drug_catalogue SET nhis_price = 350, updated_at = NOW() 
WHERE code = 'NHIA-12-04-35' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 350);
UPDATE drug_catalogue SET nhis_price = 302, updated_at = NOW() 
WHERE code = 'NHIA-12-04-36' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 302);
UPDATE drug_catalogue SET nhis_price = 264, updated_at = NOW() 
WHERE code = 'NHIA-12-04-37' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 264);
UPDATE drug_catalogue SET nhis_price = 283, updated_at = NOW() 
WHERE code = 'NHIA-12-04-38' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 283);
UPDATE drug_catalogue SET nhis_price = 268, updated_at = NOW() 
WHERE code = 'NHIA-12-04-39' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 268);
UPDATE drug_catalogue SET nhis_price = 318, updated_at = NOW() 
WHERE code = 'NHIA-12-04-40' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 318);
UPDATE drug_catalogue SET nhis_price = 2218, updated_at = NOW() 
WHERE code = 'NHIA-12-04-41' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2218);
UPDATE drug_catalogue SET nhis_price = 351, updated_at = NOW() 
WHERE code = 'NHIA-12-04-42' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 351);
UPDATE drug_catalogue SET nhis_price = 107, updated_at = NOW() 
WHERE code = 'NHIA-12-04-43' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 107);
UPDATE drug_catalogue SET nhis_price = 62, updated_at = NOW() 
WHERE code = 'NHIA-12-04-44' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 62);
UPDATE drug_catalogue SET nhis_price = 78, updated_at = NOW() 
WHERE code = 'NHIA-12-04-45' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 78);
UPDATE drug_catalogue SET nhis_price = 70, updated_at = NOW() 
WHERE code = 'NHIA-12-04-46' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 70);
UPDATE drug_catalogue SET nhis_price = 204, updated_at = NOW() 
WHERE code = 'NHIA-12-04-47' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 204);
UPDATE drug_catalogue SET nhis_price = 108, updated_at = NOW() 
WHERE code = 'NHIA-12-04-48' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 108);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-12-04-49' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 126, updated_at = NOW() 
WHERE code = 'NHIA-12-04-50' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 126);
UPDATE drug_catalogue SET nhis_price = 69, updated_at = NOW() 
WHERE code = 'NHIA-12-04-51' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 69);
UPDATE drug_catalogue SET nhis_price = 71, updated_at = NOW() 
WHERE code = 'NHIA-12-04-52' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 71);
UPDATE drug_catalogue SET nhis_price = 400, updated_at = NOW() 
WHERE code = 'NHIA-12-04-53' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 400);
UPDATE drug_catalogue SET nhis_price = 226, updated_at = NOW() 
WHERE code = 'NHIA-12-04-54' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 226);
UPDATE drug_catalogue SET nhis_price = 157, updated_at = NOW() 
WHERE code = 'NHIA-12-04-55' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 157);
UPDATE drug_catalogue SET nhis_price = 212, updated_at = NOW() 
WHERE code = 'NHIA-12-04-56' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 212);
UPDATE drug_catalogue SET nhis_price = 157, updated_at = NOW() 
WHERE code = 'NHIA-12-04-57' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 157);
UPDATE drug_catalogue SET nhis_price = 200, updated_at = NOW() 
WHERE code = 'NHIA-12-04-58' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 200);
UPDATE drug_catalogue SET nhis_price = 67, updated_at = NOW() 
WHERE code = 'NHIA-12-04-59' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 67);
UPDATE drug_catalogue SET nhis_price = 187, updated_at = NOW() 
WHERE code = 'NHIA-12-04-60' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 187);
UPDATE drug_catalogue SET nhis_price = 272, updated_at = NOW() 
WHERE code = 'NHIA-12-04-61' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 272);
UPDATE drug_catalogue SET nhis_price = 590, updated_at = NOW() 
WHERE code = 'NHIA-12-04-62' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 590);
UPDATE drug_catalogue SET nhis_price = 414, updated_at = NOW() 
WHERE code = 'NHIA-12-04-63' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 414);
UPDATE drug_catalogue SET nhis_price = 910, updated_at = NOW() 
WHERE code = 'NHIA-12-04-64' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 910);
UPDATE drug_catalogue SET nhis_price = 574, updated_at = NOW() 
WHERE code = 'NHIA-12-04-65' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 574);
UPDATE drug_catalogue SET nhis_price = 916, updated_at = NOW() 
WHERE code = 'NHIA-12-04-66' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 916);
UPDATE drug_catalogue SET nhis_price = 1031, updated_at = NOW() 
WHERE code = 'NHIA-12-04-67' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1031);
UPDATE drug_catalogue SET nhis_price = 938, updated_at = NOW() 
WHERE code = 'NHIA-12-04-68' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 938);
UPDATE drug_catalogue SET nhis_price = 1003, updated_at = NOW() 
WHERE code = 'NHIA-12-04-69' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1003);
UPDATE drug_catalogue SET nhis_price = 70, updated_at = NOW() 
WHERE code = 'NHIA-12-04-70' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 70);
UPDATE drug_catalogue SET nhis_price = 70, updated_at = NOW() 
WHERE code = 'NHIA-12-04-71' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 70);
UPDATE drug_catalogue SET nhis_price = 119, updated_at = NOW() 
WHERE code = 'NHIA-12-04-72' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 119);
UPDATE drug_catalogue SET nhis_price = 128, updated_at = NOW() 
WHERE code = 'NHIA-12-04-73' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 128);
UPDATE drug_catalogue SET nhis_price = 74, updated_at = NOW() 
WHERE code = 'NHIA-12-04-74' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 74);
UPDATE drug_catalogue SET nhis_price = 84, updated_at = NOW() 
WHERE code = 'NHIA-12-04-75' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 84);
UPDATE drug_catalogue SET nhis_price = 90, updated_at = NOW() 
WHERE code = 'NHIA-12-04-76' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 90);
UPDATE drug_catalogue SET nhis_price = 34, updated_at = NOW() 
WHERE code = 'NHIA-12-04-77' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 34);
UPDATE drug_catalogue SET nhis_price = 34, updated_at = NOW() 
WHERE code = 'NHIA-12-04-78' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 34);
UPDATE drug_catalogue SET nhis_price = 34, updated_at = NOW() 
WHERE code = 'NHIA-12-04-79' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 34);
UPDATE drug_catalogue SET nhis_price = 248, updated_at = NOW() 
WHERE code = 'NHIA-12-04-80' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 248);
UPDATE drug_catalogue SET nhis_price = 270, updated_at = NOW() 
WHERE code = 'NHIA-12-04-81' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 270);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-12-04-82' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 398, updated_at = NOW() 
WHERE code = 'NHIA-12-04-83' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 398);
UPDATE drug_catalogue SET nhis_price = 327, updated_at = NOW() 
WHERE code = 'NHIA-12-04-84' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 327);
UPDATE drug_catalogue SET nhis_price = 237, updated_at = NOW() 
WHERE code = 'NHIA-12-04-85' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 237);
UPDATE drug_catalogue SET nhis_price = 219, updated_at = NOW() 
WHERE code = 'NHIA-12-04-86' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 219);
UPDATE drug_catalogue SET nhis_price = 266, updated_at = NOW() 
WHERE code = 'NHIA-12-04-87' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 266);
UPDATE drug_catalogue SET nhis_price = 173, updated_at = NOW() 
WHERE code = 'NHIA-12-04-88' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 173);
UPDATE drug_catalogue SET nhis_price = 194, updated_at = NOW() 
WHERE code = 'NHIA-12-04-89' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 194);
UPDATE drug_catalogue SET nhis_price = 53, updated_at = NOW() 
WHERE code = 'NHIA-12-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 53);
UPDATE drug_catalogue SET nhis_price = 39, updated_at = NOW() 
WHERE code = 'NHIA-12-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 39);
UPDATE drug_catalogue SET nhis_price = 87, updated_at = NOW() 
WHERE code = 'NHIA-12-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 87);
UPDATE drug_catalogue SET nhis_price = 2074, updated_at = NOW() 
WHERE code = 'NHIA-12-05-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2074);
UPDATE drug_catalogue SET nhis_price = 239, updated_at = NOW() 
WHERE code = 'NHIA-12-05-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 239);
UPDATE drug_catalogue SET nhis_price = 2111, updated_at = NOW() 
WHERE code = 'NHIA-12-05-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2111);
UPDATE drug_catalogue SET nhis_price = 6527, updated_at = NOW() 
WHERE code = 'NHIA-12-05-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6527);
UPDATE drug_catalogue SET nhis_price = 122, updated_at = NOW() 
WHERE code = 'NHIA-12-06-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 122);
UPDATE drug_catalogue SET nhis_price = 154, updated_at = NOW() 
WHERE code = 'NHIA-12-06-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 154);
UPDATE drug_catalogue SET nhis_price = 24, updated_at = NOW() 
WHERE code = 'NHIA-12-06-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 24);
UPDATE drug_catalogue SET nhis_price = 107, updated_at = NOW() 
WHERE code = 'NHIA-12-06-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 107);
UPDATE drug_catalogue SET nhis_price = 273, updated_at = NOW() 
WHERE code = 'NHIA-12-06-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 273);
UPDATE drug_catalogue SET nhis_price = 193, updated_at = NOW() 
WHERE code = 'NHIA-12-06-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 193);
UPDATE drug_catalogue SET nhis_price = 212, updated_at = NOW() 
WHERE code = 'NHIA-12-06-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 212);
UPDATE drug_catalogue SET nhis_price = 210, updated_at = NOW() 
WHERE code = 'NHIA-12-06-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 210);
UPDATE drug_catalogue SET nhis_price = 83, updated_at = NOW() 
WHERE code = 'NHIA-12-06-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 83);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-12-06-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 93, updated_at = NOW() 
WHERE code = 'NHIA-12-06-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 93);
UPDATE drug_catalogue SET nhis_price = 494, updated_at = NOW() 
WHERE code = 'NHIA-12-06-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 494);
UPDATE drug_catalogue SET nhis_price = 305, updated_at = NOW() 
WHERE code = 'NHIA-13-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 305);
UPDATE drug_catalogue SET nhis_price = 904, updated_at = NOW() 
WHERE code = 'NHIA-13-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 904);
UPDATE drug_catalogue SET nhis_price = 3600, updated_at = NOW() 
WHERE code = 'NHIA-13-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3600);
UPDATE drug_catalogue SET nhis_price = 1480, updated_at = NOW() 
WHERE code = 'NHIA-13-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1480);
UPDATE drug_catalogue SET nhis_price = 1658, updated_at = NOW() 
WHERE code = 'NHIA-13-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1658);
UPDATE drug_catalogue SET nhis_price = 1419, updated_at = NOW() 
WHERE code = 'NHIA-13-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1419);
UPDATE drug_catalogue SET nhis_price = 1493, updated_at = NOW() 
WHERE code = 'NHIA-13-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1493);
UPDATE drug_catalogue SET nhis_price = 1343, updated_at = NOW() 
WHERE code = 'NHIA-13-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1343);
UPDATE drug_catalogue SET nhis_price = 1016, updated_at = NOW() 
WHERE code = 'NHIA-13-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1016);
UPDATE drug_catalogue SET nhis_price = 2302, updated_at = NOW() 
WHERE code = 'NHIA-13-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2302);
UPDATE drug_catalogue SET nhis_price = 1941, updated_at = NOW() 
WHERE code = 'NHIA-14-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1941);
UPDATE drug_catalogue SET nhis_price = 342, updated_at = NOW() 
WHERE code = 'NHIA-14-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 342);
UPDATE drug_catalogue SET nhis_price = 680, updated_at = NOW() 
WHERE code = 'NHIA-14-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 680);
UPDATE drug_catalogue SET nhis_price = 397, updated_at = NOW() 
WHERE code = 'NHIA-14-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 397);
UPDATE drug_catalogue SET nhis_price = 392, updated_at = NOW() 
WHERE code = 'NHIA-14-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 392);
UPDATE drug_catalogue SET nhis_price = 3584, updated_at = NOW() 
WHERE code = 'NHIA-14-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3584);
UPDATE drug_catalogue SET nhis_price = 354, updated_at = NOW() 
WHERE code = 'NHIA-14-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 354);
UPDATE drug_catalogue SET nhis_price = 506, updated_at = NOW() 
WHERE code = 'NHIA-14-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 506);
UPDATE drug_catalogue SET nhis_price = 2136, updated_at = NOW() 
WHERE code = 'NHIA-14-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2136);
UPDATE drug_catalogue SET nhis_price = 2414, updated_at = NOW() 
WHERE code = 'NHIA-14-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2414);
UPDATE drug_catalogue SET nhis_price = 901, updated_at = NOW() 
WHERE code = 'NHIA-14-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 901);
UPDATE drug_catalogue SET nhis_price = 565, updated_at = NOW() 
WHERE code = 'NHIA-14-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 565);
UPDATE drug_catalogue SET nhis_price = 1090, updated_at = NOW() 
WHERE code = 'NHIA-14-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1090);
UPDATE drug_catalogue SET nhis_price = 1397, updated_at = NOW() 
WHERE code = 'NHIA-14-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1397);
UPDATE drug_catalogue SET nhis_price = 1820, updated_at = NOW() 
WHERE code = 'NHIA-14-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1820);
UPDATE drug_catalogue SET nhis_price = 2043, updated_at = NOW() 
WHERE code = 'NHIA-14-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2043);
UPDATE drug_catalogue SET nhis_price = 1126, updated_at = NOW() 
WHERE code = 'NHIA-14-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1126);
UPDATE drug_catalogue SET nhis_price = 1825, updated_at = NOW() 
WHERE code = 'NHIA-14-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1825);
UPDATE drug_catalogue SET nhis_price = 244, updated_at = NOW() 
WHERE code = 'NHIA-14-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 244);
UPDATE drug_catalogue SET nhis_price = 734, updated_at = NOW() 
WHERE code = 'NHIA-14-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 734);
UPDATE drug_catalogue SET nhis_price = 2531, updated_at = NOW() 
WHERE code = 'NHIA-14-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2531);
UPDATE drug_catalogue SET nhis_price = 2495, updated_at = NOW() 
WHERE code = 'NHIA-14-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2495);
UPDATE drug_catalogue SET nhis_price = 1021, updated_at = NOW() 
WHERE code = 'NHIA-14-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1021);
UPDATE drug_catalogue SET nhis_price = 1588, updated_at = NOW() 
WHERE code = 'NHIA-14-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1588);
UPDATE drug_catalogue SET nhis_price = 493, updated_at = NOW() 
WHERE code = 'NHIA-14-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 493);
UPDATE drug_catalogue SET nhis_price = 921, updated_at = NOW() 
WHERE code = 'NHIA-14-05-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 921);
UPDATE drug_catalogue SET nhis_price = 704, updated_at = NOW() 
WHERE code = 'NHIA-14-06-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 704);
UPDATE drug_catalogue SET nhis_price = 907, updated_at = NOW() 
WHERE code = 'NHIA-14-06-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 907);
UPDATE drug_catalogue SET nhis_price = 727, updated_at = NOW() 
WHERE code = 'NHIA-14-06-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 727);
UPDATE drug_catalogue SET nhis_price = 1332, updated_at = NOW() 
WHERE code = 'NHIA-14-06-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1332);
UPDATE drug_catalogue SET nhis_price = 1578, updated_at = NOW() 
WHERE code = 'NHIA-14-06-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1578);
UPDATE drug_catalogue SET nhis_price = 1019, updated_at = NOW() 
WHERE code = 'NHIA-14-06-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1019);
UPDATE drug_catalogue SET nhis_price = 2267, updated_at = NOW() 
WHERE code = 'NHIA-14-06-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2267);
UPDATE drug_catalogue SET nhis_price = 1355, updated_at = NOW() 
WHERE code = 'NHIA-14-06-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1355);
UPDATE drug_catalogue SET nhis_price = 1154, updated_at = NOW() 
WHERE code = 'NHIA-14-06-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1154);
UPDATE drug_catalogue SET nhis_price = 1659, updated_at = NOW() 
WHERE code = 'NHIA-14-06-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1659);
UPDATE drug_catalogue SET nhis_price = 1401, updated_at = NOW() 
WHERE code = 'NHIA-14-06-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1401);
UPDATE drug_catalogue SET nhis_price = 1027, updated_at = NOW() 
WHERE code = 'NHIA-14-06-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1027);
UPDATE drug_catalogue SET nhis_price = 756, updated_at = NOW() 
WHERE code = 'NHIA-14-06-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 756);
UPDATE drug_catalogue SET nhis_price = 792, updated_at = NOW() 
WHERE code = 'NHIA-14-06-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 792);
UPDATE drug_catalogue SET nhis_price = 1657, updated_at = NOW() 
WHERE code = 'NHIA-14-06-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1657);
UPDATE drug_catalogue SET nhis_price = 886, updated_at = NOW() 
WHERE code = 'NHIA-14-06-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 886);
UPDATE drug_catalogue SET nhis_price = 3411, updated_at = NOW() 
WHERE code = 'NHIA-14-06-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3411);
UPDATE drug_catalogue SET nhis_price = 575, updated_at = NOW() 
WHERE code = 'NHIA-14-07-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 575);
UPDATE drug_catalogue SET nhis_price = 2892, updated_at = NOW() 
WHERE code = 'NHIA-14-07-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2892);
UPDATE drug_catalogue SET nhis_price = 2892, updated_at = NOW() 
WHERE code = 'NHIA-14-07-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2892);
UPDATE drug_catalogue SET nhis_price = 3489, updated_at = NOW() 
WHERE code = 'NHIA-14-07-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3489);
UPDATE drug_catalogue SET nhis_price = 893, updated_at = NOW() 
WHERE code = 'NHIA-14-07-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 893);
UPDATE drug_catalogue SET nhis_price = 803, updated_at = NOW() 
WHERE code = 'NHIA-14-07-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 803);
UPDATE drug_catalogue SET nhis_price = 2767, updated_at = NOW() 
WHERE code = 'NHIA-14-07-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2767);
UPDATE drug_catalogue SET nhis_price = 647, updated_at = NOW() 
WHERE code = 'NHIA-15-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 647);
UPDATE drug_catalogue SET nhis_price = 658, updated_at = NOW() 
WHERE code = 'NHIA-15-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 658);
UPDATE drug_catalogue SET nhis_price = 695, updated_at = NOW() 
WHERE code = 'NHIA-15-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 695);
UPDATE drug_catalogue SET nhis_price = 828, updated_at = NOW() 
WHERE code = 'NHIA-15-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 828);
UPDATE drug_catalogue SET nhis_price = 1220, updated_at = NOW() 
WHERE code = 'NHIA-15-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1220);
UPDATE drug_catalogue SET nhis_price = 1351, updated_at = NOW() 
WHERE code = 'NHIA-15-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1351);
UPDATE drug_catalogue SET nhis_price = 1952, updated_at = NOW() 
WHERE code = 'NHIA-15-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1952);
UPDATE drug_catalogue SET nhis_price = 1293, updated_at = NOW() 
WHERE code = 'NHIA-15-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1293);
UPDATE drug_catalogue SET nhis_price = 1692, updated_at = NOW() 
WHERE code = 'NHIA-15-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1692);
UPDATE drug_catalogue SET nhis_price = 2243, updated_at = NOW() 
WHERE code = 'NHIA-15-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2243);
UPDATE drug_catalogue SET nhis_price = 1884, updated_at = NOW() 
WHERE code = 'NHIA-15-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1884);
UPDATE drug_catalogue SET nhis_price = 3937, updated_at = NOW() 
WHERE code = 'NHIA-15-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3937);
UPDATE drug_catalogue SET nhis_price = 1269, updated_at = NOW() 
WHERE code = 'NHIA-15-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1269);
UPDATE drug_catalogue SET nhis_price = 19, updated_at = NOW() 
WHERE code = 'NHIA-15-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 19);
UPDATE drug_catalogue SET nhis_price = 765, updated_at = NOW() 
WHERE code = 'NHIA-15-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 765);
UPDATE drug_catalogue SET nhis_price = 145, updated_at = NOW() 
WHERE code = 'NHIA-15-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 145);
UPDATE drug_catalogue SET nhis_price = 1714, updated_at = NOW() 
WHERE code = 'NHIA-15-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1714);
UPDATE drug_catalogue SET nhis_price = 2147, updated_at = NOW() 
WHERE code = 'NHIA-15-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2147);
UPDATE drug_catalogue SET nhis_price = 2175, updated_at = NOW() 
WHERE code = 'NHIA-15-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2175);
UPDATE drug_catalogue SET nhis_price = 1062, updated_at = NOW() 
WHERE code = 'NHIA-15-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1062);
UPDATE drug_catalogue SET nhis_price = 3318, updated_at = NOW() 
WHERE code = 'NHIA-15-02-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3318);
UPDATE drug_catalogue SET nhis_price = 2009, updated_at = NOW() 
WHERE code = 'NHIA-15-02-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2009);
UPDATE drug_catalogue SET nhis_price = 75, updated_at = NOW() 
WHERE code = 'NHIA-15-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 75);
UPDATE drug_catalogue SET nhis_price = 1039, updated_at = NOW() 
WHERE code = 'NHIA-15-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1039);
UPDATE drug_catalogue SET nhis_price = 142, updated_at = NOW() 
WHERE code = 'NHIA-15-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 142);
UPDATE drug_catalogue SET nhis_price = 915, updated_at = NOW() 
WHERE code = 'NHIA-16-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 915);
UPDATE drug_catalogue SET nhis_price = 17, updated_at = NOW() 
WHERE code = 'NHIA-16-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 17);
UPDATE drug_catalogue SET nhis_price = 19, updated_at = NOW() 
WHERE code = 'NHIA-16-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 19);
UPDATE drug_catalogue SET nhis_price = 1549, updated_at = NOW() 
WHERE code = 'NHIA-16-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1549);
UPDATE drug_catalogue SET nhis_price = 20, updated_at = NOW() 
WHERE code = 'NHIA-16-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 20);
UPDATE drug_catalogue SET nhis_price = 931, updated_at = NOW() 
WHERE code = 'NHIA-16-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 931);
UPDATE drug_catalogue SET nhis_price = 44, updated_at = NOW() 
WHERE code = 'NHIA-16-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 44);
UPDATE drug_catalogue SET nhis_price = 936, updated_at = NOW() 
WHERE code = 'NHIA-16-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 936);
UPDATE drug_catalogue SET nhis_price = 33, updated_at = NOW() 
WHERE code = 'NHIA-16-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 33);
UPDATE drug_catalogue SET nhis_price = 634, updated_at = NOW() 
WHERE code = 'NHIA-16-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 634);
UPDATE drug_catalogue SET nhis_price = 64, updated_at = NOW() 
WHERE code = 'NHIA-16-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 64);
UPDATE drug_catalogue SET nhis_price = 30, updated_at = NOW() 
WHERE code = 'NHIA-16-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 30);
UPDATE drug_catalogue SET nhis_price = 16, updated_at = NOW() 
WHERE code = 'NHIA-16-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 16);
UPDATE drug_catalogue SET nhis_price = 244, updated_at = NOW() 
WHERE code = 'NHIA-16-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 244);
UPDATE drug_catalogue SET nhis_price = 59, updated_at = NOW() 
WHERE code = 'NHIA-16-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 59);
UPDATE drug_catalogue SET nhis_price = 10, updated_at = NOW() 
WHERE code = 'NHIA-16-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10);
UPDATE drug_catalogue SET nhis_price = 670, updated_at = NOW() 
WHERE code = 'NHIA-16-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 670);
UPDATE drug_catalogue SET nhis_price = 110, updated_at = NOW() 
WHERE code = 'NHIA-16-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 110);
UPDATE drug_catalogue SET nhis_price = 33, updated_at = NOW() 
WHERE code = 'NHIA-16-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 33);
UPDATE drug_catalogue SET nhis_price = 727, updated_at = NOW() 
WHERE code = 'NHIA-16-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 727);
UPDATE drug_catalogue SET nhis_price = 32, updated_at = NOW() 
WHERE code = 'NHIA-16-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 32);
UPDATE drug_catalogue SET nhis_price = 970, updated_at = NOW() 
WHERE code = 'NHIA-16-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 970);
UPDATE drug_catalogue SET nhis_price = 248, updated_at = NOW() 
WHERE code = 'NHIA-16-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 248);
UPDATE drug_catalogue SET nhis_price = 93, updated_at = NOW() 
WHERE code = 'NHIA-16-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 93);
UPDATE drug_catalogue SET nhis_price = 501, updated_at = NOW() 
WHERE code = 'NHIA-16-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 501);
UPDATE drug_catalogue SET nhis_price = 810, updated_at = NOW() 
WHERE code = 'NHIA-16-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 810);
UPDATE drug_catalogue SET nhis_price = 122, updated_at = NOW() 
WHERE code = 'NHIA-16-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 122);
UPDATE drug_catalogue SET nhis_price = 17958, updated_at = NOW() 
WHERE code = 'NHIA-16-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 17958);
UPDATE drug_catalogue SET nhis_price = 2208, updated_at = NOW() 
WHERE code = 'NHIA-16-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2208);
UPDATE drug_catalogue SET nhis_price = 40, updated_at = NOW() 
WHERE code = 'NHIA-16-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 40);
UPDATE drug_catalogue SET nhis_price = 35, updated_at = NOW() 
WHERE code = 'NHIA-16-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 35);
UPDATE drug_catalogue SET nhis_price = 701, updated_at = NOW() 
WHERE code = 'NHIA-16-05-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 701);
UPDATE drug_catalogue SET nhis_price = 500, updated_at = NOW() 
WHERE code = 'NHIA-16-05-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 500);
UPDATE drug_catalogue SET nhis_price = 314, updated_at = NOW() 
WHERE code = 'NHIA-16-06-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 314);
UPDATE drug_catalogue SET nhis_price = 340, updated_at = NOW() 
WHERE code = 'NHIA-16-06-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 340);
UPDATE drug_catalogue SET nhis_price = 342, updated_at = NOW() 
WHERE code = 'NHIA-16-06-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 342);
UPDATE drug_catalogue SET nhis_price = 314, updated_at = NOW() 
WHERE code = 'NHIA-16-06-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 314);
UPDATE drug_catalogue SET nhis_price = 506, updated_at = NOW() 
WHERE code = 'NHIA-16-06-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 506);
UPDATE drug_catalogue SET nhis_price = 76, updated_at = NOW() 
WHERE code = 'NHIA-16-00-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 76);
UPDATE drug_catalogue SET nhis_price = 89, updated_at = NOW() 
WHERE code = 'NHIA-16-00-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 89);
UPDATE drug_catalogue SET nhis_price = 343, updated_at = NOW() 
WHERE code = 'NHIA-16-00-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 343);
UPDATE drug_catalogue SET nhis_price = 268, updated_at = NOW() 
WHERE code = 'NHIA-16-00-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 268);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-16-00-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 65, updated_at = NOW() 
WHERE code = 'NHIA-16-00-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 65);
UPDATE drug_catalogue SET nhis_price = 1094, updated_at = NOW() 
WHERE code = 'NHIA-16-00-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1094);
UPDATE drug_catalogue SET nhis_price = 167, updated_at = NOW() 
WHERE code = 'NHIA-16-00-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 167);
UPDATE drug_catalogue SET nhis_price = 54, updated_at = NOW() 
WHERE code = 'NHIA-16-00-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 54);
UPDATE drug_catalogue SET nhis_price = 87, updated_at = NOW() 
WHERE code = 'NHIA-16-00-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 87);
UPDATE drug_catalogue SET nhis_price = 427, updated_at = NOW() 
WHERE code = 'NHIA-16-00-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 427);
UPDATE drug_catalogue SET nhis_price = 440, updated_at = NOW() 
WHERE code = 'NHIA-16-00-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 440);
UPDATE drug_catalogue SET nhis_price = 1035, updated_at = NOW() 
WHERE code = 'NHIA-16-00-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1035);
UPDATE drug_catalogue SET nhis_price = 770, updated_at = NOW() 
WHERE code = 'NHIA-16-00-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 770);
UPDATE drug_catalogue SET nhis_price = 1583, updated_at = NOW() 
WHERE code = 'NHIA-16-00-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1583);
UPDATE drug_catalogue SET nhis_price = 15, updated_at = NOW() 
WHERE code = 'NHIA-17-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15);
UPDATE drug_catalogue SET nhis_price = 117, updated_at = NOW() 
WHERE code = 'NHIA-17-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 117);
UPDATE drug_catalogue SET nhis_price = 740, updated_at = NOW() 
WHERE code = 'NHIA-17-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 740);
UPDATE drug_catalogue SET nhis_price = 650, updated_at = NOW() 
WHERE code = 'NHIA-17-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 650);
UPDATE drug_catalogue SET nhis_price = 3416, updated_at = NOW() 
WHERE code = 'NHIA-17-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3416);
UPDATE drug_catalogue SET nhis_price = 31, updated_at = NOW() 
WHERE code = 'NHIA-17-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 31);
UPDATE drug_catalogue SET nhis_price = 1005, updated_at = NOW() 
WHERE code = 'NHIA-17-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1005);
UPDATE drug_catalogue SET nhis_price = 140, updated_at = NOW() 
WHERE code = 'NHIA-17-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 140);
UPDATE drug_catalogue SET nhis_price = 1124, updated_at = NOW() 
WHERE code = 'NHIA-17-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1124);
UPDATE drug_catalogue SET nhis_price = 1238, updated_at = NOW() 
WHERE code = 'NHIA-17-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1238);
UPDATE drug_catalogue SET nhis_price = 1577, updated_at = NOW() 
WHERE code = 'NHIA-17-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1577);
UPDATE drug_catalogue SET nhis_price = 4878, updated_at = NOW() 
WHERE code = 'NHIA-17-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4878);
UPDATE drug_catalogue SET nhis_price = 3026, updated_at = NOW() 
WHERE code = 'NHIA-17-03-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3026);
UPDATE drug_catalogue SET nhis_price = 653, updated_at = NOW() 
WHERE code = 'NHIA-17-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 653);
UPDATE drug_catalogue SET nhis_price = 156, updated_at = NOW() 
WHERE code = 'NHIA-17-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 156);
UPDATE drug_catalogue SET nhis_price = 1065, updated_at = NOW() 
WHERE code = 'NHIA-17-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1065);
UPDATE drug_catalogue SET nhis_price = 2261, updated_at = NOW() 
WHERE code = 'NHIA-17-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2261);
UPDATE drug_catalogue SET nhis_price = 25364, updated_at = NOW() 
WHERE code = 'NHIA-17-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 25364);
UPDATE drug_catalogue SET nhis_price = 678, updated_at = NOW() 
WHERE code = 'NHIA-17-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 678);
UPDATE drug_catalogue SET nhis_price = 378, updated_at = NOW() 
WHERE code = 'NHIA-17-04-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 378);
UPDATE drug_catalogue SET nhis_price = 21509, updated_at = NOW() 
WHERE code = 'NHIA-17-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 21509);
UPDATE drug_catalogue SET nhis_price = 34288, updated_at = NOW() 
WHERE code = 'NHIA-17-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 34288);
UPDATE drug_catalogue SET nhis_price = 5124, updated_at = NOW() 
WHERE code = 'NHIA-17-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5124);
UPDATE drug_catalogue SET nhis_price = 13400, updated_at = NOW() 
WHERE code = 'NHIA-17-06-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 13400);
UPDATE drug_catalogue SET nhis_price = 12449, updated_at = NOW() 
WHERE code = 'NHIA-17-06-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12449);
UPDATE drug_catalogue SET nhis_price = 12474, updated_at = NOW() 
WHERE code = 'NHIA-17-06-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12474);
UPDATE drug_catalogue SET nhis_price = 7468, updated_at = NOW() 
WHERE code = 'NHIA-17-06-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7468);
UPDATE drug_catalogue SET nhis_price = 10460, updated_at = NOW() 
WHERE code = 'NHIA-17-06-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10460);
UPDATE drug_catalogue SET nhis_price = 12518, updated_at = NOW() 
WHERE code = 'NHIA-17-06-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12518);
UPDATE drug_catalogue SET nhis_price = 2677, updated_at = NOW() 
WHERE code = 'NHIA-17-06-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2677);
UPDATE drug_catalogue SET nhis_price = 11185, updated_at = NOW() 
WHERE code = 'NHIA-17-06-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11185);
UPDATE drug_catalogue SET nhis_price = 9010, updated_at = NOW() 
WHERE code = 'NHIA-17-06-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 9010);
UPDATE drug_catalogue SET nhis_price = 8858, updated_at = NOW() 
WHERE code = 'NHIA-17-06-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8858);
UPDATE drug_catalogue SET nhis_price = 10575, updated_at = NOW() 
WHERE code = 'NHIA-17-06-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10575);
UPDATE drug_catalogue SET nhis_price = 65, updated_at = NOW() 
WHERE code = 'NHIA-17-06-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 65);
UPDATE drug_catalogue SET nhis_price = 44, updated_at = NOW() 
WHERE code = 'NHIA-17-06-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 44);
UPDATE drug_catalogue SET nhis_price = 28, updated_at = NOW() 
WHERE code = 'NHIA-17-06-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 28);
UPDATE drug_catalogue SET nhis_price = 83, updated_at = NOW() 
WHERE code = 'NHIA-17-06-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 83);
UPDATE drug_catalogue SET nhis_price = 385, updated_at = NOW() 
WHERE code = 'NHIA-17-06-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 385);
UPDATE drug_catalogue SET nhis_price = 387, updated_at = NOW() 
WHERE code = 'NHIA-17-06-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 387);
UPDATE drug_catalogue SET nhis_price = 102, updated_at = NOW() 
WHERE code = 'NHIA-17-06-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 102);
UPDATE drug_catalogue SET nhis_price = 128, updated_at = NOW() 
WHERE code = 'NHIA-17-06-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 128);
UPDATE drug_catalogue SET nhis_price = 30189, updated_at = NOW() 
WHERE code = 'NHIA-17-06-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 30189);
UPDATE drug_catalogue SET nhis_price = 106, updated_at = NOW() 
WHERE code = 'NHIA-17-06-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 106);
UPDATE drug_catalogue SET nhis_price = 130, updated_at = NOW() 
WHERE code = 'NHIA-17-06-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 130);
UPDATE drug_catalogue SET nhis_price = 169, updated_at = NOW() 
WHERE code = 'NHIA-17-06-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 169);
UPDATE drug_catalogue SET nhis_price = 165, updated_at = NOW() 
WHERE code = 'NHIA-17-06-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 165);
UPDATE drug_catalogue SET nhis_price = 140, updated_at = NOW() 
WHERE code = 'NHIA-17-06-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 140);
UPDATE drug_catalogue SET nhis_price = 171, updated_at = NOW() 
WHERE code = 'NHIA-17-06-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 171);
UPDATE drug_catalogue SET nhis_price = 1400, updated_at = NOW() 
WHERE code = 'NHIA-17-06-27' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1400);
UPDATE drug_catalogue SET nhis_price = 1125, updated_at = NOW() 
WHERE code = 'NHIA-17-06-28' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1125);
UPDATE drug_catalogue SET nhis_price = 67, updated_at = NOW() 
WHERE code = 'NHIA-17-07-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 67);
UPDATE drug_catalogue SET nhis_price = 189, updated_at = NOW() 
WHERE code = 'NHIA-17-07-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 189);
UPDATE drug_catalogue SET nhis_price = 226, updated_at = NOW() 
WHERE code = 'NHIA-17-07-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 226);
UPDATE drug_catalogue SET nhis_price = 4372, updated_at = NOW() 
WHERE code = 'NHIA-17-07-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4372);
UPDATE drug_catalogue SET nhis_price = 244, updated_at = NOW() 
WHERE code = 'NHIA-17-07-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 244);
UPDATE drug_catalogue SET nhis_price = 445, updated_at = NOW() 
WHERE code = 'NHIA-17-08-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 445);
UPDATE drug_catalogue SET nhis_price = 268, updated_at = NOW() 
WHERE code = 'NHIA-17-08-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 268);
UPDATE drug_catalogue SET nhis_price = 439, updated_at = NOW() 
WHERE code = 'NHIA-17-08-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 439);
UPDATE drug_catalogue SET nhis_price = 390, updated_at = NOW() 
WHERE code = 'NHIA-17-08-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 390);
UPDATE drug_catalogue SET nhis_price = 345, updated_at = NOW() 
WHERE code = 'NHIA-17-08-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 345);
UPDATE drug_catalogue SET nhis_price = 500, updated_at = NOW() 
WHERE code = 'NHIA-17-08-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 500);
UPDATE drug_catalogue SET nhis_price = 30165, updated_at = NOW() 
WHERE code = 'NHIA-18-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 30165);
UPDATE drug_catalogue SET nhis_price = 1830, updated_at = NOW() 
WHERE code = 'NHIA-18-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1830);
UPDATE drug_catalogue SET nhis_price = 4953, updated_at = NOW() 
WHERE code = 'NHIA-18-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4953);
UPDATE drug_catalogue SET nhis_price = 63500, updated_at = NOW() 
WHERE code = 'NHIA-18-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 63500);
UPDATE drug_catalogue SET nhis_price = 4617, updated_at = NOW() 
WHERE code = 'NHIA-18-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4617);
UPDATE drug_catalogue SET nhis_price = 7535, updated_at = NOW() 
WHERE code = 'NHIA-18-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7535);
UPDATE drug_catalogue SET nhis_price = 5124, updated_at = NOW() 
WHERE code = 'NHIA-18-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5124);
UPDATE drug_catalogue SET nhis_price = 3500, updated_at = NOW() 
WHERE code = 'NHIA-18-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3500);
UPDATE drug_catalogue SET nhis_price = 15, updated_at = NOW() 
WHERE code = 'NHIA-18-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15);
UPDATE drug_catalogue SET nhis_price = 0.55, updated_at = NOW() 
WHERE code = 'NHIA-18-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 0.55);
UPDATE drug_catalogue SET nhis_price = 0.5, updated_at = NOW() 
WHERE code = 'NHIA-18-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 0.5);
UPDATE drug_catalogue SET nhis_price = 0.5, updated_at = NOW() 
WHERE code = 'NHIA-18-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 0.5);
UPDATE drug_catalogue SET nhis_price = 671, updated_at = NOW() 
WHERE code = 'NHIA-18-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 671);
UPDATE drug_catalogue SET nhis_price = 33709, updated_at = NOW() 
WHERE code = 'NHIA-18-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 33709);
UPDATE drug_catalogue SET nhis_price = 11688, updated_at = NOW() 
WHERE code = 'NHIA-18-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11688);
UPDATE drug_catalogue SET nhis_price = 22000, updated_at = NOW() 
WHERE code = 'NHIA-18-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 22000);
UPDATE drug_catalogue SET nhis_price = 15537, updated_at = NOW() 
WHERE code = 'NHIA-18-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15537);
UPDATE drug_catalogue SET nhis_price = 12200, updated_at = NOW() 
WHERE code = 'NHIA-18-02-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12200);
UPDATE drug_catalogue SET nhis_price = 11250, updated_at = NOW() 
WHERE code = 'NHIA-18-02-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11250);
UPDATE drug_catalogue SET nhis_price = 35575, updated_at = NOW() 
WHERE code = 'NHIA-18-02-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 35575);
UPDATE drug_catalogue SET nhis_price = 2440, updated_at = NOW() 
WHERE code = 'NHIA-18-02-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2440);
UPDATE drug_catalogue SET nhis_price = 1510, updated_at = NOW() 
WHERE code = 'NHIA-18-02-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1510);
UPDATE drug_catalogue SET nhis_price = 586, updated_at = NOW() 
WHERE code = 'NHIA-19-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 586);
UPDATE drug_catalogue SET nhis_price = 558, updated_at = NOW() 
WHERE code = 'NHIA-19-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 558);
UPDATE drug_catalogue SET nhis_price = 670, updated_at = NOW() 
WHERE code = 'NHIA-19-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 670);
UPDATE drug_catalogue SET nhis_price = 1501, updated_at = NOW() 
WHERE code = 'NHIA-19-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1501);
UPDATE drug_catalogue SET nhis_price = 1911, updated_at = NOW() 
WHERE code = 'NHIA-19-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1911);
UPDATE drug_catalogue SET nhis_price = 599, updated_at = NOW() 
WHERE code = 'NHIA-19-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 599);
UPDATE drug_catalogue SET nhis_price = 1871, updated_at = NOW() 
WHERE code = 'NHIA-19-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1871);
UPDATE drug_catalogue SET nhis_price = 1326, updated_at = NOW() 
WHERE code = 'NHIA-19-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1326);
UPDATE drug_catalogue SET nhis_price = 2055, updated_at = NOW() 
WHERE code = 'NHIA-19-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2055);
UPDATE drug_catalogue SET nhis_price = 1204, updated_at = NOW() 
WHERE code = 'NHIA-19-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1204);
UPDATE drug_catalogue SET nhis_price = 1334, updated_at = NOW() 
WHERE code = 'NHIA-19-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1334);
UPDATE drug_catalogue SET nhis_price = 2348, updated_at = NOW() 
WHERE code = 'NHIA-19-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2348);
UPDATE drug_catalogue SET nhis_price = 1228, updated_at = NOW() 
WHERE code = 'NHIA-19-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1228);
UPDATE drug_catalogue SET nhis_price = 1449, updated_at = NOW() 
WHERE code = 'NHIA-19-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1449);
UPDATE drug_catalogue SET nhis_price = 2862, updated_at = NOW() 
WHERE code = 'NHIA-19-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2862);
UPDATE drug_catalogue SET nhis_price = 1358, updated_at = NOW() 
WHERE code = 'NHIA-19-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1358);
UPDATE drug_catalogue SET nhis_price = 2277, updated_at = NOW() 
WHERE code = 'NHIA-19-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2277);
UPDATE drug_catalogue SET nhis_price = 939, updated_at = NOW() 
WHERE code = 'NHIA-19-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 939);
UPDATE drug_catalogue SET nhis_price = 1068, updated_at = NOW() 
WHERE code = 'NHIA-19-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1068);
UPDATE drug_catalogue SET nhis_price = 2640, updated_at = NOW() 
WHERE code = 'NHIA-19-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2640);
UPDATE drug_catalogue SET nhis_price = 2477, updated_at = NOW() 
WHERE code = 'NHIA-19-03-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2477);
UPDATE drug_catalogue SET nhis_price = 1017, updated_at = NOW() 
WHERE code = 'NHIA-19-03-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1017);
UPDATE drug_catalogue SET nhis_price = 3103, updated_at = NOW() 
WHERE code = 'NHIA-19-03-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3103);
UPDATE drug_catalogue SET nhis_price = 3843, updated_at = NOW() 
WHERE code = 'NHIA-19-03-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3843);
UPDATE drug_catalogue SET nhis_price = 1091, updated_at = NOW() 
WHERE code = 'NHIA-19-03-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1091);
UPDATE drug_catalogue SET nhis_price = 2145, updated_at = NOW() 
WHERE code = 'NHIA-19-03-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2145);
UPDATE drug_catalogue SET nhis_price = 4173, updated_at = NOW() 
WHERE code = 'NHIA-19-03-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4173);
UPDATE drug_catalogue SET nhis_price = 971, updated_at = NOW() 
WHERE code = 'NHIA-19-03-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 971);
UPDATE drug_catalogue SET nhis_price = 60, updated_at = NOW() 
WHERE code = 'NHIA-19-04-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 60);
UPDATE drug_catalogue SET nhis_price = 10427, updated_at = NOW() 
WHERE code = 'NHIA-19-04-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10427);
UPDATE drug_catalogue SET nhis_price = 2316, updated_at = NOW() 
WHERE code = 'NHIA-19-04-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2316);
UPDATE drug_catalogue SET nhis_price = 1677, updated_at = NOW() 
WHERE code = 'NHIA-19-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1677);
UPDATE drug_catalogue SET nhis_price = 14957, updated_at = NOW() 
WHERE code = 'NHIA-19-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 14957);
UPDATE drug_catalogue SET nhis_price = 4455, updated_at = NOW() 
WHERE code = 'NHIA-19-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4455);
UPDATE drug_catalogue SET nhis_price = 5388, updated_at = NOW() 
WHERE code = 'NHIA-19-04-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5388);
UPDATE drug_catalogue SET nhis_price = 8327, updated_at = NOW() 
WHERE code = 'NHIA-19-04-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8327);
UPDATE drug_catalogue SET nhis_price = 2355, updated_at = NOW() 
WHERE code = 'NHIA-19-04-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2355);
UPDATE drug_catalogue SET nhis_price = 1458, updated_at = NOW() 
WHERE code = 'NHIA-19-04-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1458);
UPDATE drug_catalogue SET nhis_price = 5790, updated_at = NOW() 
WHERE code = 'NHIA-19-04-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5790);
UPDATE drug_catalogue SET nhis_price = 9018, updated_at = NOW() 
WHERE code = 'NHIA-19-04-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 9018);
UPDATE drug_catalogue SET nhis_price = 1429, updated_at = NOW() 
WHERE code = 'NHIA-19-05-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1429);
UPDATE drug_catalogue SET nhis_price = 1637, updated_at = NOW() 
WHERE code = 'NHIA-19-05-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1637);
UPDATE drug_catalogue SET nhis_price = 1985, updated_at = NOW() 
WHERE code = 'NHIA-19-05-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1985);
UPDATE drug_catalogue SET nhis_price = 4270, updated_at = NOW() 
WHERE code = 'NHIA-19-05-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4270);
UPDATE drug_catalogue SET nhis_price = 878, updated_at = NOW() 
WHERE code = 'NHIA-19-06-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 878);
UPDATE drug_catalogue SET nhis_price = 137, updated_at = NOW() 
WHERE code = 'NHIA-19-06-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 137);
UPDATE drug_catalogue SET nhis_price = 2461, updated_at = NOW() 
WHERE code = 'NHIA-19-06-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2461);
UPDATE drug_catalogue SET nhis_price = 22, updated_at = NOW() 
WHERE code = 'NHIA-20-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 22);
UPDATE drug_catalogue SET nhis_price = 487, updated_at = NOW() 
WHERE code = 'NHIA-20-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 487);
UPDATE drug_catalogue SET nhis_price = 1537, updated_at = NOW() 
WHERE code = 'NHIA-20-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1537);
UPDATE drug_catalogue SET nhis_price = 122, updated_at = NOW() 
WHERE code = 'NHIA-20-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 122);
UPDATE drug_catalogue SET nhis_price = 580, updated_at = NOW() 
WHERE code = 'NHIA-20-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 580);
UPDATE drug_catalogue SET nhis_price = 6344, updated_at = NOW() 
WHERE code = 'NHIA-20-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6344);
UPDATE drug_catalogue SET nhis_price = 415, updated_at = NOW() 
WHERE code = 'NHIA-21-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 415);
UPDATE drug_catalogue SET nhis_price = 219, updated_at = NOW() 
WHERE code = 'NHIA-21-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 219);
UPDATE drug_catalogue SET nhis_price = 356, updated_at = NOW() 
WHERE code = 'NHIA-21-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 356);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 2225, updated_at = NOW() 
WHERE code = 'NHIA-21-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2225);
UPDATE drug_catalogue SET nhis_price = 1086, updated_at = NOW() 
WHERE code = 'NHIA-21-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1086);
UPDATE drug_catalogue SET nhis_price = 1757, updated_at = NOW() 
WHERE code = 'NHIA-21-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1757);
UPDATE drug_catalogue SET nhis_price = 1806, updated_at = NOW() 
WHERE code = 'NHIA-21-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1806);
UPDATE drug_catalogue SET nhis_price = 1007, updated_at = NOW() 
WHERE code = 'NHIA-21-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1007);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 1482, updated_at = NOW() 
WHERE code = 'NHIA-21-02-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1482);
UPDATE drug_catalogue SET nhis_price = 720, updated_at = NOW() 
WHERE code = 'NHIA-21-02-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 720);
UPDATE drug_catalogue SET nhis_price = 190, updated_at = NOW() 
WHERE code = 'NHIA-21-02-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 190);
UPDATE drug_catalogue SET nhis_price = 55, updated_at = NOW() 
WHERE code = 'NHIA-23-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 55);
UPDATE drug_catalogue SET nhis_price = 92, updated_at = NOW() 
WHERE code = 'NHIA-23-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 92);
UPDATE drug_catalogue SET nhis_price = 34, updated_at = NOW() 
WHERE code = 'NHIA-23-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 34);
UPDATE drug_catalogue SET nhis_price = 2477, updated_at = NOW() 
WHERE code = 'NHIA-23-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2477);
UPDATE drug_catalogue SET nhis_price = 152, updated_at = NOW() 
WHERE code = 'NHIA-23-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 152);
UPDATE drug_catalogue SET nhis_price = 57, updated_at = NOW() 
WHERE code = 'NHIA-23-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 57);
UPDATE drug_catalogue SET nhis_price = 57, updated_at = NOW() 
WHERE code = 'NHIA-23-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 57);
UPDATE drug_catalogue SET nhis_price = 140, updated_at = NOW() 
WHERE code = 'NHIA-23-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 140);
UPDATE drug_catalogue SET nhis_price = 1446, updated_at = NOW() 
WHERE code = 'NHIA-23-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1446);
UPDATE drug_catalogue SET nhis_price = 378, updated_at = NOW() 
WHERE code = 'NHIA-23-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 378);
UPDATE drug_catalogue SET nhis_price = 37, updated_at = NOW() 
WHERE code = 'NHIA-23-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 37);
UPDATE drug_catalogue SET nhis_price = 91, updated_at = NOW() 
WHERE code = 'NHIA-23-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 91);
UPDATE drug_catalogue SET nhis_price = 155, updated_at = NOW() 
WHERE code = 'NHIA-23-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 155);
UPDATE drug_catalogue SET nhis_price = 155, updated_at = NOW() 
WHERE code = 'NHIA-23-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 155);
UPDATE drug_catalogue SET nhis_price = 275, updated_at = NOW() 
WHERE code = 'NHIA-23-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 275);
UPDATE drug_catalogue SET nhis_price = 699, updated_at = NOW() 
WHERE code = 'NHIA-23-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 699);
UPDATE drug_catalogue SET nhis_price = 433, updated_at = NOW() 
WHERE code = 'NHIA-23-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 433);
UPDATE drug_catalogue SET nhis_price = 39, updated_at = NOW() 
WHERE code = 'NHIA-23-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 39);
UPDATE drug_catalogue SET nhis_price = 32, updated_at = NOW() 
WHERE code = 'NHIA-23-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 32);
UPDATE drug_catalogue SET nhis_price = 131, updated_at = NOW() 
WHERE code = 'NHIA-23-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 131);
UPDATE drug_catalogue SET nhis_price = 144, updated_at = NOW() 
WHERE code = 'NHIA-23-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 144);
UPDATE drug_catalogue SET nhis_price = 141, updated_at = NOW() 
WHERE code = 'NHIA-23-02-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 141);
UPDATE drug_catalogue SET nhis_price = 239, updated_at = NOW() 
WHERE code = 'NHIA-23-02-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 239);
UPDATE drug_catalogue SET nhis_price = 250, updated_at = NOW() 
WHERE code = 'NHIA-23-02-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 250);
UPDATE drug_catalogue SET nhis_price = 204, updated_at = NOW() 
WHERE code = 'NHIA-23-02-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 204);
UPDATE drug_catalogue SET nhis_price = 237, updated_at = NOW() 
WHERE code = 'NHIA-23-02-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 237);
UPDATE drug_catalogue SET nhis_price = 147, updated_at = NOW() 
WHERE code = 'NHIA-23-03-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 147);
UPDATE drug_catalogue SET nhis_price = 271, updated_at = NOW() 
WHERE code = 'NHIA-23-03-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 271);
UPDATE drug_catalogue SET nhis_price = 7741, updated_at = NOW() 
WHERE code = 'NHIA-23-03-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7741);
UPDATE drug_catalogue SET nhis_price = 96, updated_at = NOW() 
WHERE code = 'NHIA-23-03-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 96);
UPDATE drug_catalogue SET nhis_price = 88, updated_at = NOW() 
WHERE code = 'NHIA-23-03-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 88);
UPDATE drug_catalogue SET nhis_price = 82, updated_at = NOW() 
WHERE code = 'NHIA-23-03-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 82);
UPDATE drug_catalogue SET nhis_price = 1269, updated_at = NOW() 
WHERE code = 'NHIA-23-03-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1269);
UPDATE drug_catalogue SET nhis_price = 379, updated_at = NOW() 
WHERE code = 'NHIA-23-03-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 379);
UPDATE drug_catalogue SET nhis_price = 82, updated_at = NOW() 
WHERE code = 'NHIA-23-03-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 82);
UPDATE drug_catalogue SET nhis_price = 1118, updated_at = NOW() 
WHERE code = 'NHIA-23-03-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1118);
UPDATE drug_catalogue SET nhis_price = 3471, updated_at = NOW() 
WHERE code = 'NHIA-23-03-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3471);
UPDATE drug_catalogue SET nhis_price = 45, updated_at = NOW() 
WHERE code = 'NHIA-23-03-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 45);
UPDATE drug_catalogue SET nhis_price = 1806, updated_at = NOW() 
WHERE code = 'NHIA-23-03-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1806);
UPDATE drug_catalogue SET nhis_price = 410, updated_at = NOW() 
WHERE code = 'NHIA-23-03-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 410);
UPDATE drug_catalogue SET nhis_price = 39, updated_at = NOW() 
WHERE code = 'NHIA-23-03-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 39);
UPDATE drug_catalogue SET nhis_price = 568, updated_at = NOW() 
WHERE code = 'NHIA-23-03-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 568);
UPDATE drug_catalogue SET nhis_price = 171, updated_at = NOW() 
WHERE code = 'NHIA-23-03-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 171);
UPDATE drug_catalogue SET nhis_price = 68, updated_at = NOW() 
WHERE code = 'NHIA-23-03-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 68);
UPDATE drug_catalogue SET nhis_price = 346, updated_at = NOW() 
WHERE code = 'NHIA-23-03-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 346);
UPDATE drug_catalogue SET nhis_price = 34, updated_at = NOW() 
WHERE code = 'NHIA-23-03-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 34);
UPDATE drug_catalogue SET nhis_price = 47, updated_at = NOW() 
WHERE code = 'NHIA-23-03-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 47);
UPDATE drug_catalogue SET nhis_price = 210, updated_at = NOW() 
WHERE code = 'NHIA-23-03-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 210);
UPDATE drug_catalogue SET nhis_price = 318, updated_at = NOW() 
WHERE code = 'NHIA-23-03-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 318);
UPDATE drug_catalogue SET nhis_price = 250, updated_at = NOW() 
WHERE code = 'NHIA-23-04-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 250);
UPDATE drug_catalogue SET nhis_price = 350, updated_at = NOW() 
WHERE code = 'NHIA-23-04-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 350);
UPDATE drug_catalogue SET nhis_price = 500, updated_at = NOW() 
WHERE code = 'NHIA-23-04-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 500);
UPDATE drug_catalogue SET nhis_price = 781, updated_at = NOW() 
WHERE code = 'NHIA-24-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 781);
UPDATE drug_catalogue SET nhis_price = 5693, updated_at = NOW() 
WHERE code = 'NHIA-24-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 5693);
UPDATE drug_catalogue SET nhis_price = 44, updated_at = NOW() 
WHERE code = 'NHIA-24-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 44);
UPDATE drug_catalogue SET nhis_price = 921, updated_at = NOW() 
WHERE code = 'NHIA-24-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 921);
UPDATE drug_catalogue SET nhis_price = 927, updated_at = NOW() 
WHERE code = 'NHIA-24-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 927);
UPDATE drug_catalogue SET nhis_price = 2757, updated_at = NOW() 
WHERE code = 'NHIA-24-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2757);
UPDATE drug_catalogue SET nhis_price = 27, updated_at = NOW() 
WHERE code = 'NHIA-24-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 27);
UPDATE drug_catalogue SET nhis_price = 696, updated_at = NOW() 
WHERE code = 'NHIA-24-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 696);
UPDATE drug_catalogue SET nhis_price = 7313, updated_at = NOW() 
WHERE code = 'NHIA-24-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7313);
UPDATE drug_catalogue SET nhis_price = 647, updated_at = NOW() 
WHERE code = 'NHIA-24-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 647);
UPDATE drug_catalogue SET nhis_price = 1464, updated_at = NOW() 
WHERE code = 'NHIA-24-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1464);
UPDATE drug_catalogue SET nhis_price = 715, updated_at = NOW() 
WHERE code = 'NHIA-24-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 715);
UPDATE drug_catalogue SET nhis_price = 3945, updated_at = NOW() 
WHERE code = 'NHIA-24-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3945);
UPDATE drug_catalogue SET nhis_price = 1220, updated_at = NOW() 
WHERE code = 'NHIA-24-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1220);
UPDATE drug_catalogue SET nhis_price = 13175, updated_at = NOW() 
WHERE code = 'NHIA-24-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 13175);
UPDATE drug_catalogue SET nhis_price = 36, updated_at = NOW() 
WHERE code = 'NHIA-24-01-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 36);
UPDATE drug_catalogue SET nhis_price = 60, updated_at = NOW() 
WHERE code = 'NHIA-24-01-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 60);
UPDATE drug_catalogue SET nhis_price = 1790, updated_at = NOW() 
WHERE code = 'NHIA-24-01-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1790);
UPDATE drug_catalogue SET nhis_price = 1752, updated_at = NOW() 
WHERE code = 'NHIA-24-01-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1752);
UPDATE drug_catalogue SET nhis_price = 893, updated_at = NOW() 
WHERE code = 'NHIA-24-01-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 893);
UPDATE drug_catalogue SET nhis_price = 1039, updated_at = NOW() 
WHERE code = 'NHIA-24-01-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1039);
UPDATE drug_catalogue SET nhis_price = 178, updated_at = NOW() 
WHERE code = 'NHIA-24-01-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 178);
UPDATE drug_catalogue SET nhis_price = 141, updated_at = NOW() 
WHERE code = 'NHIA-24-01-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 141);
UPDATE drug_catalogue SET nhis_price = 123, updated_at = NOW() 
WHERE code = 'NHIA-24-01-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 123);
UPDATE drug_catalogue SET nhis_price = 247, updated_at = NOW() 
WHERE code = 'NHIA-24-01-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 247);
UPDATE drug_catalogue SET nhis_price = 6734, updated_at = NOW() 
WHERE code = 'NHIA-24-01-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6734);
UPDATE drug_catalogue SET nhis_price = 159, updated_at = NOW() 
WHERE code = 'NHIA-24-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 159);
UPDATE drug_catalogue SET nhis_price = 1131, updated_at = NOW() 
WHERE code = 'NHIA-24-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1131);
UPDATE drug_catalogue SET nhis_price = 1830, updated_at = NOW() 
WHERE code = 'NHIA-24-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1830);
UPDATE drug_catalogue SET nhis_price = 1025, updated_at = NOW() 
WHERE code = 'NHIA-24-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1025);
UPDATE drug_catalogue SET nhis_price = 903, updated_at = NOW() 
WHERE code = 'NHIA-24-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 903);
UPDATE drug_catalogue SET nhis_price = 677, updated_at = NOW() 
WHERE code = 'NHIA-24-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 677);
UPDATE drug_catalogue SET nhis_price = 988, updated_at = NOW() 
WHERE code = 'NHIA-24-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 988);
UPDATE drug_catalogue SET nhis_price = 110, updated_at = NOW() 
WHERE code = 'NHIA-25-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 110);
UPDATE drug_catalogue SET nhis_price = 210, updated_at = NOW() 
WHERE code = 'NHIA-25-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 210);
UPDATE drug_catalogue SET nhis_price = 12, updated_at = NOW() 
WHERE code = 'NHIA-25-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12);
UPDATE drug_catalogue SET nhis_price = 700, updated_at = NOW() 
WHERE code = 'NHIA-25-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 700);
UPDATE drug_catalogue SET nhis_price = 1488, updated_at = NOW() 
WHERE code = 'NHIA-25-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1488);
UPDATE drug_catalogue SET nhis_price = 322, updated_at = NOW() 
WHERE code = 'NHIA-25-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 322);
UPDATE drug_catalogue SET nhis_price = 15, updated_at = NOW() 
WHERE code = 'NHIA-25-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15);
UPDATE drug_catalogue SET nhis_price = 39, updated_at = NOW() 
WHERE code = 'NHIA-25-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 39);
UPDATE drug_catalogue SET nhis_price = 8, updated_at = NOW() 
WHERE code = 'NHIA-25-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 8);
UPDATE drug_catalogue SET nhis_price = 1312, updated_at = NOW() 
WHERE code = 'NHIA-25-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1312);
UPDATE drug_catalogue SET nhis_price = 10, updated_at = NOW() 
WHERE code = 'NHIA-25-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10);
UPDATE drug_catalogue SET nhis_price = 900, updated_at = NOW() 
WHERE code = 'NHIA-25-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 900);
UPDATE drug_catalogue SET nhis_price = 106, updated_at = NOW() 
WHERE code = 'NHIA-25-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 106);
UPDATE drug_catalogue SET nhis_price = 61, updated_at = NOW() 
WHERE code = 'NHIA-25-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 61);
UPDATE drug_catalogue SET nhis_price = 57, updated_at = NOW() 
WHERE code = 'NHIA-25-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 57);
UPDATE drug_catalogue SET nhis_price = 220, updated_at = NOW() 
WHERE code = 'NHIA-25-01-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 220);
UPDATE drug_catalogue SET nhis_price = 220, updated_at = NOW() 
WHERE code = 'NHIA-25-01-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 220);
UPDATE drug_catalogue SET nhis_price = 13, updated_at = NOW() 
WHERE code = 'NHIA-25-01-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 13);
UPDATE drug_catalogue SET nhis_price = 29, updated_at = NOW() 
WHERE code = 'NHIA-25-01-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 29);
UPDATE drug_catalogue SET nhis_price = 6, updated_at = NOW() 
WHERE code = 'NHIA-25-01-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6);
UPDATE drug_catalogue SET nhis_price = 1174, updated_at = NOW() 
WHERE code = 'NHIA-25-01-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1174);
UPDATE drug_catalogue SET nhis_price = 641, updated_at = NOW() 
WHERE code = 'NHIA-25-01-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 641);
UPDATE drug_catalogue SET nhis_price = 92, updated_at = NOW() 
WHERE code = 'NHIA-25-01-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 92);
UPDATE drug_catalogue SET nhis_price = 415, updated_at = NOW() 
WHERE code = 'NHIA-25-01-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 415);
UPDATE drug_catalogue SET nhis_price = 11, updated_at = NOW() 
WHERE code = 'NHIA-25-01-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 11);
UPDATE drug_catalogue SET nhis_price = 14, updated_at = NOW() 
WHERE code = 'NHIA-26-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 14);
UPDATE drug_catalogue SET nhis_price = 13, updated_at = NOW() 
WHERE code = 'NHIA-26-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 13);
UPDATE drug_catalogue SET nhis_price = 15, updated_at = NOW() 
WHERE code = 'NHIA-26-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 15);
UPDATE drug_catalogue SET nhis_price = 153, updated_at = NOW() 
WHERE code = 'NHIA-26-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 153);
UPDATE drug_catalogue SET nhis_price = 561, updated_at = NOW() 
WHERE code = 'NHIA-26-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 561);
UPDATE drug_catalogue SET nhis_price = 31, updated_at = NOW() 
WHERE code = 'NHIA-26-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 31);
UPDATE drug_catalogue SET nhis_price = 24, updated_at = NOW() 
WHERE code = 'NHIA-26-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 24);
UPDATE drug_catalogue SET nhis_price = 3416, updated_at = NOW() 
WHERE code = 'NHIA-27-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3416);
UPDATE drug_catalogue SET nhis_price = 741, updated_at = NOW() 
WHERE code = 'NHIA-27-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 741);
UPDATE drug_catalogue SET nhis_price = 799, updated_at = NOW() 
WHERE code = 'NHIA-27-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 799);
UPDATE drug_catalogue SET nhis_price = 6954, updated_at = NOW() 
WHERE code = 'NHIA-27-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 6954);
UPDATE drug_catalogue SET nhis_price = 3416, updated_at = NOW() 
WHERE code = 'NHIA-27-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3416);
UPDATE drug_catalogue SET nhis_price = 9150, updated_at = NOW() 
WHERE code = 'NHIA-27-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 9150);
UPDATE drug_catalogue SET nhis_price = 4209, updated_at = NOW() 
WHERE code = 'NHIA-27-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4209);
UPDATE drug_catalogue SET nhis_price = 1098, updated_at = NOW() 
WHERE code = 'NHIA-27-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1098);
UPDATE drug_catalogue SET nhis_price = 677, updated_at = NOW() 
WHERE code = 'NHIA-27-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 677);
UPDATE drug_catalogue SET nhis_price = 3745, updated_at = NOW() 
WHERE code = 'NHIA-27-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3745);
UPDATE drug_catalogue SET nhis_price = 2135, updated_at = NOW() 
WHERE code = 'NHIA-27-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2135);
UPDATE drug_catalogue SET nhis_price = 140, updated_at = NOW() 
WHERE code = 'NHIA-27-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 140);
UPDATE drug_catalogue SET nhis_price = 102, updated_at = NOW() 
WHERE code = 'NHIA-27-01-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 102);
UPDATE drug_catalogue SET nhis_price = 323, updated_at = NOW() 
WHERE code = 'NHIA-27-01-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 323);
UPDATE drug_catalogue SET nhis_price = 3355, updated_at = NOW() 
WHERE code = 'NHIA-27-01-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 3355);
UPDATE drug_catalogue SET nhis_price = 1196, updated_at = NOW() 
WHERE code = 'NHIA-27-01-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1196);
UPDATE drug_catalogue SET nhis_price = 67, updated_at = NOW() 
WHERE code = 'NHIA-28-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 67);
UPDATE drug_catalogue SET nhis_price = 321, updated_at = NOW() 
WHERE code = 'NHIA-28-02-00' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 321);
UPDATE drug_catalogue SET nhis_price = 519, updated_at = NOW() 
WHERE code = 'NHIA-28-02-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 519);
UPDATE drug_catalogue SET nhis_price = 793, updated_at = NOW() 
WHERE code = 'NHIA-28-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 793);
UPDATE drug_catalogue SET nhis_price = 400, updated_at = NOW() 
WHERE code = 'NHIA-28-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 400);
UPDATE drug_catalogue SET nhis_price = 1415, updated_at = NOW() 
WHERE code = 'NHIA-28-02-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1415);
UPDATE drug_catalogue SET nhis_price = 173, updated_at = NOW() 
WHERE code = 'NHIA-28-02-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 173);
UPDATE drug_catalogue SET nhis_price = 159, updated_at = NOW() 
WHERE code = 'NHIA-28-02-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 159);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-28-02-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 1976, updated_at = NOW() 
WHERE code = 'NHIA-28-02-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1976);
UPDATE drug_catalogue SET nhis_price = 20, updated_at = NOW() 
WHERE code = 'NHIA-28-02-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 20);
UPDATE drug_catalogue SET nhis_price = 549, updated_at = NOW() 
WHERE code = 'NHIA-28-02-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 549);
UPDATE drug_catalogue SET nhis_price = 708, updated_at = NOW() 
WHERE code = 'NHIA-28-02-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 708);
UPDATE drug_catalogue SET nhis_price = 872, updated_at = NOW() 
WHERE code = 'NHIA-28-02-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 872);
UPDATE drug_catalogue SET nhis_price = 85, updated_at = NOW() 
WHERE code = 'NHIA-28-02-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 85);
UPDATE drug_catalogue SET nhis_price = 2379, updated_at = NOW() 
WHERE code = 'NHIA-28-02-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2379);
UPDATE drug_catalogue SET nhis_price = 128, updated_at = NOW() 
WHERE code = 'NHIA-28-02-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 128);
UPDATE drug_catalogue SET nhis_price = 482, updated_at = NOW() 
WHERE code = 'NHIA-28-02-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 482);
UPDATE drug_catalogue SET nhis_price = 55, updated_at = NOW() 
WHERE code = 'NHIA-28-02-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 55);
UPDATE drug_catalogue SET nhis_price = 67, updated_at = NOW() 
WHERE code = 'NHIA-28-02-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 67);
UPDATE drug_catalogue SET nhis_price = 100, updated_at = NOW() 
WHERE code = 'NHIA-28-02-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100);
UPDATE drug_catalogue SET nhis_price = 207, updated_at = NOW() 
WHERE code = 'NHIA-28-02-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 207);
UPDATE drug_catalogue SET nhis_price = 400, updated_at = NOW() 
WHERE code = 'NHIA-28-02-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 400);
UPDATE drug_catalogue SET nhis_price = 573, updated_at = NOW() 
WHERE code = 'NHIA-28-02-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 573);
UPDATE drug_catalogue SET nhis_price = 143, updated_at = NOW() 
WHERE code = 'NHIA-28-02-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 143);
UPDATE drug_catalogue SET nhis_price = 192, updated_at = NOW() 
WHERE code = 'NHIA-28-02-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 192);
UPDATE drug_catalogue SET nhis_price = 85, updated_at = NOW() 
WHERE code = 'NHIA-28-02-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 85);
UPDATE drug_catalogue SET nhis_price = 13176, updated_at = NOW() 
WHERE code = 'NHIA-29-00-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 13176);
UPDATE drug_catalogue SET nhis_price = 7564, updated_at = NOW() 
WHERE code = 'NHIA-29-00-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 7564);
UPDATE drug_catalogue SET nhis_price = 21045, updated_at = NOW() 
WHERE code = 'NHIA-30-00-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 21045);
UPDATE drug_catalogue SET nhis_price = 35966, updated_at = NOW() 
WHERE code = 'NHIA-30-00-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 35966);
UPDATE drug_catalogue SET nhis_price = 339514, updated_at = NOW() 
WHERE code = 'NHIA-30-00-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 339514);
UPDATE drug_catalogue SET nhis_price = 27609, updated_at = NOW() 
WHERE code = 'NHIA-30-00-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 27609);
UPDATE drug_catalogue SET nhis_price = 700, updated_at = NOW() 
WHERE code = 'NHIA-31-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 700);
UPDATE drug_catalogue SET nhis_price = 227, updated_at = NOW() 
WHERE code = 'NHIA-31-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 227);
UPDATE drug_catalogue SET nhis_price = 602, updated_at = NOW() 
WHERE code = 'NHIA-31-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 602);
UPDATE drug_catalogue SET nhis_price = 426, updated_at = NOW() 
WHERE code = 'NHIA-31-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 426);
UPDATE drug_catalogue SET nhis_price = 317, updated_at = NOW() 
WHERE code = 'NHIA-31-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 317);
UPDATE drug_catalogue SET nhis_price = 217, updated_at = NOW() 
WHERE code = 'NHIA-31-01-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 217);
UPDATE drug_catalogue SET nhis_price = 268, updated_at = NOW() 
WHERE code = 'NHIA-31-01-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 268);
UPDATE drug_catalogue SET nhis_price = 249, updated_at = NOW() 
WHERE code = 'NHIA-31-01-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 249);
UPDATE drug_catalogue SET nhis_price = 181, updated_at = NOW() 
WHERE code = 'NHIA-31-01-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 181);
UPDATE drug_catalogue SET nhis_price = 627, updated_at = NOW() 
WHERE code = 'NHIA-31-01-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 627);
UPDATE drug_catalogue SET nhis_price = 440, updated_at = NOW() 
WHERE code = 'NHIA-31-01-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 440);
UPDATE drug_catalogue SET nhis_price = 558, updated_at = NOW() 
WHERE code = 'NHIA-31-01-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 558);
UPDATE drug_catalogue SET nhis_price = 102809, updated_at = NOW() 
WHERE code = 'NHIA-32-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 102809);
UPDATE drug_catalogue SET nhis_price = 71000, updated_at = NOW() 
WHERE code = 'NHIA-32-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 71000);
UPDATE drug_catalogue SET nhis_price = 75000, updated_at = NOW() 
WHERE code = 'NHIA-32-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 75000);
UPDATE drug_catalogue SET nhis_price = 295645, updated_at = NOW() 
WHERE code = 'NHIA-32-01-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 295645);
UPDATE drug_catalogue SET nhis_price = 62000, updated_at = NOW() 
WHERE code = 'NHIA-32-01-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 62000);
UPDATE drug_catalogue SET nhis_price = 13054, updated_at = NOW() 
WHERE code = 'NHIA-32-02-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 13054);
UPDATE drug_catalogue SET nhis_price = 17904, updated_at = NOW() 
WHERE code = 'NHIA-32-02-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 17904);
UPDATE drug_catalogue SET nhis_price = 4896, updated_at = NOW() 
WHERE code = 'NHIA-33-01-00' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 4896);
UPDATE drug_catalogue SET nhis_price = 10000, updated_at = NOW() 
WHERE code = 'NHIA-33-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10000);
UPDATE drug_catalogue SET nhis_price = 19217, updated_at = NOW() 
WHERE code = 'NHIA-33-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 19217);
UPDATE drug_catalogue SET nhis_price = 91415, updated_at = NOW() 
WHERE code = 'NHIA-33-01-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 91415);
UPDATE drug_catalogue SET nhis_price = 2000, updated_at = NOW() 
WHERE code = 'NHIA-34-00-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2000);
UPDATE drug_catalogue SET nhis_price = 2000, updated_at = NOW() 
WHERE code = 'NHIA-34-00-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2000);
UPDATE drug_catalogue SET nhis_price = 2000, updated_at = NOW() 
WHERE code = 'NHIA-34-00-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 2000);
UPDATE drug_catalogue SET nhis_price = 100000, updated_at = NOW() 
WHERE code = 'NHIA-34-00-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 100000);
UPDATE drug_catalogue SET nhis_price = 315586, updated_at = NOW() 
WHERE code = 'NHIA-34-00-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 315586);
UPDATE drug_catalogue SET nhis_price = 240396, updated_at = NOW() 
WHERE code = 'NHIA-34-00-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 240396);
UPDATE drug_catalogue SET nhis_price = 40000, updated_at = NOW() 
WHERE code = 'NHIA-35-01-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 40000);
UPDATE drug_catalogue SET nhis_price = 12000, updated_at = NOW() 
WHERE code = 'NHIA-35-01-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 12000);
UPDATE drug_catalogue SET nhis_price = 213256, updated_at = NOW() 
WHERE code = 'NHIA-36-00-01' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 213256);
UPDATE drug_catalogue SET nhis_price = 594396, updated_at = NOW() 
WHERE code = 'NHIA-36-00-02' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 594396);
UPDATE drug_catalogue SET nhis_price = 601445, updated_at = NOW() 
WHERE code = 'NHIA-36-00-03' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 601445);
UPDATE drug_catalogue SET nhis_price = 1151516, updated_at = NOW() 
WHERE code = 'NHIA-36-00-04' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1151516);
UPDATE drug_catalogue SET nhis_price = 28600, updated_at = NOW() 
WHERE code = 'NHIA-36-00-05' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 28600);
UPDATE drug_catalogue SET nhis_price = 14200, updated_at = NOW() 
WHERE code = 'NHIA-36-00-06' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 14200);
UPDATE drug_catalogue SET nhis_price = 28600, updated_at = NOW() 
WHERE code = 'NHIA-36-00-07' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 28600);
UPDATE drug_catalogue SET nhis_price = 14200, updated_at = NOW() 
WHERE code = 'NHIA-36-00-08' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 14200);
UPDATE drug_catalogue SET nhis_price = 26310, updated_at = NOW() 
WHERE code = 'NHIA-36-00-09' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 26310);
UPDATE drug_catalogue SET nhis_price = 17500, updated_at = NOW() 
WHERE code = 'NHIA-36-00-10' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 17500);
UPDATE drug_catalogue SET nhis_price = 62700, updated_at = NOW() 
WHERE code = 'NHIA-36-00-11' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 62700);
UPDATE drug_catalogue SET nhis_price = 29620, updated_at = NOW() 
WHERE code = 'NHIA-36-00-12' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 29620);
UPDATE drug_catalogue SET nhis_price = 58200, updated_at = NOW() 
WHERE code = 'NHIA-36-00-13' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 58200);
UPDATE drug_catalogue SET nhis_price = 63050, updated_at = NOW() 
WHERE code = 'NHIA-36-00-14' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 63050);
UPDATE drug_catalogue SET nhis_price = 10500, updated_at = NOW() 
WHERE code = 'NHIA-36-00-15' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10500);
UPDATE drug_catalogue SET nhis_price = 10800, updated_at = NOW() 
WHERE code = 'NHIA-36-00-16' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 10800);
UPDATE drug_catalogue SET nhis_price = 46848, updated_at = NOW() 
WHERE code = 'NHIA-36-00-17' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 46848);
UPDATE drug_catalogue SET nhis_price = 604778, updated_at = NOW() 
WHERE code = 'NHIA-36-00-18' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 604778);
UPDATE drug_catalogue SET nhis_price = 195200, updated_at = NOW() 
WHERE code = 'NHIA-36-00-19' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 195200);
UPDATE drug_catalogue SET nhis_price = 1475565, updated_at = NOW() 
WHERE code = 'NHIA-36-00-20' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1475565);
UPDATE drug_catalogue SET nhis_price = 1138293, updated_at = NOW() 
WHERE code = 'NHIA-36-00-21' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1138293);
UPDATE drug_catalogue SET nhis_price = 589639, updated_at = NOW() 
WHERE code = 'NHIA-36-00-22' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 589639);
UPDATE drug_catalogue SET nhis_price = 21720, updated_at = NOW() 
WHERE code = 'NHIA-36-00-23' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 21720);
UPDATE drug_catalogue SET nhis_price = 114669, updated_at = NOW() 
WHERE code = 'NHIA-36-00-24' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 114669);
UPDATE drug_catalogue SET nhis_price = 1780440, updated_at = NOW() 
WHERE code = 'NHIA-36-00-25' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1780440);
UPDATE drug_catalogue SET nhis_price = 165000, updated_at = NOW() 
WHERE code = 'NHIA-36-00-26' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 165000);
UPDATE drug_catalogue SET nhis_price = 17, updated_at = NOW() 
WHERE code = 'NHIA-36-00-27' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 17);
UPDATE drug_catalogue SET nhis_price = 300608, updated_at = NOW() 
WHERE code = 'NHIA-36-00-28' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 300608);
UPDATE drug_catalogue SET nhis_price = 440000, updated_at = NOW() 
WHERE code = 'NHIA-36-00-29' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 440000);
UPDATE drug_catalogue SET nhis_price = 613810, updated_at = NOW() 
WHERE code = 'NHIA-36-00-30' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 613810);
UPDATE drug_catalogue SET nhis_price = 246400, updated_at = NOW() 
WHERE code = 'NHIA-36-00-31' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 246400);
UPDATE drug_catalogue SET nhis_price = 491800, updated_at = NOW() 
WHERE code = 'NHIA-36-00-32' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 491800);
UPDATE drug_catalogue SET nhis_price = 1141862, updated_at = NOW() 
WHERE code = 'NHIA-36-00-33' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 1141862);
UPDATE drug_catalogue SET nhis_price = 14700, updated_at = NOW() 
WHERE code = 'NHIA-36-00-34' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 14700);
UPDATE drug_catalogue SET nhis_price = 27130, updated_at = NOW() 
WHERE code = 'NHIA-36-00-35' AND (nhis_price IS NULL OR nhis_price = 0 OR nhis_price != 27130);

COMMIT;

-- Verify: Check remaining drugs with zero prices
-- SELECT code, name, nhis_price FROM drug_catalogue 
-- WHERE is_nhis_covered = true AND (nhis_price IS NULL OR nhis_price = 0);
