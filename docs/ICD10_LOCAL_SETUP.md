# ICD-10 Local Provider Setup Guide

This document describes how to set up and use the local ICD-10 code lookup feature, which enables offline-capable diagnosis code searching in the EMR system.

## Overview

The EMR system supports two ICD code providers:

| Provider | Source | Internet | Best For |
|----------|--------|----------|----------|
| **Local** | Supabase ICD-10 database | Not required | Offline use, faster searches, privacy |
| **Remote** | WHO ICD-11 API | Required | Latest codes, ICD-11 features |
| **Auto** | Both (fallback) | Optional | Maximum availability |

## Quick Start

### 1. Run the Migration

First, create the `icd10_codes` table in your Supabase database:

```bash
# Apply the migration via Supabase CLI
npx supabase db push

# Or apply manually in Supabase Studio SQL Editor:
# Open http://127.0.0.1:54323 and run migrations/072_icd10_codes_table.sql
```

### 2. Install the ICD-10 Data Package

```bash
npm install @lowlysre/icd-10-cm
```

### 3. Seed the Database

```bash
node scripts/seed-icd10.js
```

This will insert approximately **95,000+ ICD-10-CM codes** into your local database.

### 4. Configure the Provider

In your `.env` file:

```env
# Use local provider (recommended for offline use)
ICD_PROVIDER=local

# Or use auto mode for fallback behavior
ICD_PROVIDER=auto
```

### 5. Restart the Application

```bash
npm start
```

## Configuration Options

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `ICD_PROVIDER` | `local`, `remote`, `auto` | `auto` | Which provider to use |
| `ICD_CLIENT_ID` | string | - | WHO API client ID (for remote) |
| `ICD_CLIENT_SECRET` | string | - | WHO API client secret (for remote) |

### Provider Modes Explained

#### `local` Mode
- Uses **only** the local Supabase database
- No internet connection required
- Contains ICD-10-CM codes (US clinical modification)
- Fastest search performance
- **Requires**: Database seeded with ICD-10 codes

#### `remote` Mode
- Uses **only** the WHO ICD-11 API
- Requires internet connection
- Contains the latest ICD-11 codes
- Rate limited (20 requests/minute)
- **Requires**: Valid WHO API credentials

#### `auto` Mode (Default)
- Tries remote provider first
- Automatically falls back to local on:
  - Network errors
  - API rate limiting
  - Service unavailability
- After 3 consecutive remote failures, prefers local
- Resets preference after 60 seconds of no failures

## Database Schema

### Table: `icd10_codes`

| Column | Type | Description |
|--------|------|-------------|
| `code` | TEXT (PK) | ICD-10 code (e.g., 'A01.0', 'J18.9') |
| `description` | TEXT | Human-readable diagnosis description |
| `created_at` | TIMESTAMPTZ | When the record was inserted |

### Indexes

- **btree** on `code` - Fast exact code lookups
- **GIN full-text** on `description` - Fast keyword searches
- **GIN trigram** on `description` - Fast partial matching (if pg_trgm available)

### Functions

| Function | Description |
|----------|-------------|
| `search_icd10_codes(keyword, max_results)` | Search by code or description |
| `get_icd10_code(code)` | Get single code by exact match |
| `get_icd10_stats()` | Get total count and chapter statistics |

## Seeding Script Details

### Usage

```bash
# Basic usage
node scripts/seed-icd10.js

# With custom batch size
BATCH_SIZE=500 node scripts/seed-icd10.js

# Dry run (shows what would be inserted)
DRY_RUN=true node scripts/seed-icd10.js
```

### Script Features

- **Batch inserts**: Processes 1000 records at a time (configurable)
- **Upsert mode**: Updates existing codes, inserts new ones
- **Deduplication**: Removes duplicate codes before insertion
- **Progress display**: Shows batch progress and completion percentage
- **Error handling**: Continues on batch failures, reports summary

### Expected Output

```
╔══════════════════════════════════════════════════════════╗
║        ICD-10 Codes Seeding Script for Supabase          ║
╚══════════════════════════════════════════════════════════╝

✅ Configuration validated
   Supabase URL: http://127.0.0.1:54321
   Batch Size: 1000
   Dry Run: false

🔌 Testing database connection...
   Connected! Current rows: 0

📦 Loading ICD-10 codes from @lowlysre/icd-10-cm...
   Found 95,000 ICD-10 codes

📊 After deduplication: 95,000 unique codes

📈 Chapter distribution:
   A: 1,234 codes
   B: 567 codes
   ...

📤 Inserting 95,000 codes in batches of 1000...
   Batch 95/95 (100%)

═══════════════════════════════════════════════════════════
📊 Results:
   ✅ Inserted/Updated: 95,000
   ⏭️ Skipped: 0
   ❌ Errors: 0

   Final database count: 95,000 codes
   Chapters covered: 22

✅ Seeding complete!
```

## API Integration

### From Renderer Process (React Components)

The existing ICD hooks and services work unchanged:

```typescript
import { useICDSearch } from '@/hooks/useICD';

function DiagnosisSelector() {
  const { data: results, isLoading } = useICDSearch('diabetes');
  
  return (
    <select>
      {results?.map((item) => (
        <option key={item.code} value={item.code}>
          {item.code} - {item.title}
        </option>
      ))}
    </select>
  );
}
```

### Service Status Check

```typescript
import { getICDServiceStatus } from '@/lib/icd';

async function checkStatus() {
  const status = await getICDServiceStatus();
  console.log('Provider mode:', status.providerMode);
  console.log('Local available:', status.localAvailable);
  console.log('Local codes:', status.localCodesCount);
}
```

## ICD-10 Chapter Reference

| Chapter | Codes | Description |
|---------|-------|-------------|
| A-B | A00-B99 | Certain infectious and parasitic diseases |
| C-D | C00-D49 | Neoplasms |
| D | D50-D89 | Diseases of blood and immune system |
| E | E00-E89 | Endocrine, nutritional and metabolic diseases |
| F | F01-F99 | Mental, behavioral and neurodevelopmental disorders |
| G | G00-G99 | Diseases of the nervous system |
| H | H00-H59 | Diseases of the eye and adnexa |
| H | H60-H95 | Diseases of the ear and mastoid process |
| I | I00-I99 | Diseases of the circulatory system |
| J | J00-J99 | Diseases of the respiratory system |
| K | K00-K95 | Diseases of the digestive system |
| L | L00-L99 | Diseases of the skin and subcutaneous tissue |
| M | M00-M99 | Diseases of the musculoskeletal system |
| N | N00-N99 | Diseases of the genitourinary system |
| O | O00-O9A | Pregnancy, childbirth and the puerperium |
| P | P00-P96 | Certain conditions originating in perinatal period |
| Q | Q00-Q99 | Congenital malformations and chromosomal abnormalities |
| R | R00-R99 | Symptoms, signs and abnormal findings |
| S-T | S00-T88 | Injury, poisoning and external causes |
| V-Y | V00-Y99 | External causes of morbidity |
| Z | Z00-Z99 | Factors influencing health status |

## Troubleshooting

### "Table icd10_codes does not exist"

Run the migration:
```bash
npx supabase db push
# Or manually execute: migrations/072_icd10_codes_table.sql
```

### "Local ICD codes not available"

Seed the database:
```bash
npm install @lowlysre/icd-10-cm
node scripts/seed-icd10.js
```

### "Module @lowlysre/icd-10-cm not found"

Install the package:
```bash
npm install @lowlysre/icd-10-cm
```

### Search returns no results

1. Check if database is seeded:
   ```sql
   SELECT COUNT(*) FROM icd10_codes;
   ```

2. Verify the search term is at least 2 characters

3. Check provider mode in `.env`:
   ```env
   ICD_PROVIDER=local
   ```

### Slow searches

1. Ensure indexes are created (they're in the migration)

2. Check if pg_trgm extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

3. Analyze the table:
   ```sql
   ANALYZE icd10_codes;
   ```

## Updating ICD-10 Codes

To update the ICD-10 codes with a newer version:

1. Update the npm package:
   ```bash
   npm update @lowlysre/icd-10-cm
   ```

2. Re-run the seed script:
   ```bash
   node scripts/seed-icd10.js
   ```

The script uses upsert mode, so existing codes are updated and new codes are added.

## Security Notes

- The `icd10_codes` table has Row Level Security (RLS) enabled
- All authenticated users can **read** ICD codes
- Only the service role can **write** (insert/update/delete)
- This ensures data integrity - codes are only modified via seeding scripts

## Performance Considerations

- **Search caching**: Recent searches are cached for 60 seconds
- **Batch inserts**: Seeding uses batch of 1000 to avoid timeouts
- **Full-text index**: Enables fast keyword searches across descriptions
- **Trigram index**: Enables fast partial/fuzzy matching (if available)

## Files Reference

| File | Description |
|------|-------------|
| `migrations/072_icd10_codes_table.sql` | Table, indexes, RLS policies, functions |
| `scripts/seed-icd10.js` | Seeding script for ICD-10 data |
| `src/main/localICDProvider.ts` | Local provider implementation |
| `src/main/icdService.ts` | ICD service with provider switching |
| `docs/ICD10_LOCAL_SETUP.md` | This documentation |
