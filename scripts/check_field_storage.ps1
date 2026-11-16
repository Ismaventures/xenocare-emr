# Quick column check script
$envFile = Join-Path $PSScriptRoot "..\.env"
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") {
        Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim() -ErrorAction SilentlyContinue
    }
}

$h = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer " + $env:SUPABASE_SERVICE_ROLE_KEY
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== CHECKING SPECIALTY COLUMNS IN CONSULTATIONS TABLE ===" -ForegroundColor Cyan

# Test each column by trying to PATCH it
$testId = "102b40a6-d26e-498a-9128-708124b6b669"

$columnsToTest = @(
    @{ name = "specialty_code"; value = '"TEST_CHECK"' },
    @{ name = "specialty_data"; value = '{"test":"value"}' },
    @{ name = "specialty_template_id"; value = '"00000000-0000-0000-0000-000000000001"' },
    @{ name = "specialty_template_version"; value = '1' }
)

foreach ($col in $columnsToTest) {
    $body = "{`"$($col.name)`":$($col.value)}"
    try {
        $r = Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/consultations?consultation_id=eq.$testId" -Headers $h -Method Patch -Body $body
        Write-Host "[EXISTS] $($col.name) -> Column exists in DB" -ForegroundColor Green
    } catch {
        $errDetail = ""
        try {
            $s = $_.Exception.Response.GetResponseStream()
            $rd = New-Object System.IO.StreamReader($s)
            $errDetail = $rd.ReadToEnd()
        } catch {}
        
        if ($errDetail -match "column.*does not exist" -or $errDetail -match "Could not find") {
            Write-Host "[MISSING] $($col.name) -> Column DOES NOT exist! Data is LOST!" -ForegroundColor Red
        } elseif ($errDetail -match "violates foreign key") {
            Write-Host "[EXISTS] $($col.name) -> Column exists (FK constraint)" -ForegroundColor Green
        } else {
            Write-Host "[EXISTS] $($col.name) -> Column exists (error on value: $errDetail)" -ForegroundColor Yellow
        }
    }
}

# Revert test changes
$revertBody = '{"specialty_code":null}'
try {
    Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/consultations?consultation_id=eq.$testId" -Headers $h -Method Patch -Body $revertBody | Out-Null
} catch {}

Write-Host ""

# Now check the FULL list of DB columns
Write-Host "=== ALL CONSULTATION DB COLUMNS ===" -ForegroundColor Cyan
$rec = (Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/consultations?select=*&limit=1" -Headers @{ "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY; "Authorization" = "Bearer " + $env:SUPABASE_SERVICE_ROLE_KEY })[0]
$dbCols = $rec.PSObject.Properties.Name | Sort-Object
Write-Host "Total columns: $($dbCols.Count)"
$dbCols | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "=== FIELD STORAGE AUDIT ===" -ForegroundColor Cyan

# Fields passed by wizard
$wizardFields = @{
    "specialty_code" = "Which specialty this consultation is for"
    "specialty_template_id" = "UUID of the template version used"
    "specialty_template_version" = "Version number of template"
    "specialty_data" = "JSONB with all specialty exam form data"
}

# DTO fields
$dtoFields = @{
    "patient_id" = "Patient EMR/display ID"
    "visit_id" = "Visit display ID"
    "encounter_id" = "Visit UUID"
    "clinic_id" = "Clinic display ID"
    "complaints" = "Patient complaints"
    "clinical_notes" = "General clinical notes"
    "history_of_present_illness" = "HPI"
    "past_medical_history" = "PMH"
    "family_history" = "Family history"
    "social_history" = "Social history"
    "review_of_systems" = "ROS"
    "examination_findings" = "Examination findings text"
    "physical_examination" = "Physical exam text"
    "diagnosis" = "Diagnosis array"
    "diagnosis_text" = "Diagnosis text"
    "differential_diagnosis" = "Differential diagnosis array"
    "treatment_plan" = "Treatment plan text"
    "recommendations" = "Recommendations"
    "follow_up_date" = "Follow-up date"
    "follow_up_notes" = "Follow-up notes"
    "icd10_codes" = "ICD-10 codes JSONB"
}

# API-set fields
$apiFields = @{
    "doctor_id" = "Set by API from auth user"
    "consultation_date" = "Set by API to current time"
    "status" = "Set by API to Completed"
}

$stored = 0
$dropped = 0

Write-Host ""
Write-Host "--- Specialty Wizard Fields ---" -ForegroundColor Yellow
foreach ($f in $wizardFields.GetEnumerator() | Sort-Object Name) {
    if ($dbCols -contains $f.Name) {
        Write-Host "  [STORED]  $($f.Name) - $($f.Value)" -ForegroundColor Green
        $stored++
    } else {
        Write-Host "  [DROPPED] $($f.Name) - $($f.Value) ** DATA LOST! **" -ForegroundColor Red
        $dropped++
    }
}

Write-Host ""
Write-Host "--- Consultation Form Fields ---" -ForegroundColor Yellow
foreach ($f in $dtoFields.GetEnumerator() | Sort-Object Name) {
    if ($dbCols -contains $f.Name) {
        Write-Host "  [STORED]  $($f.Name) - $($f.Value)" -ForegroundColor Green
        $stored++
    } else {
        Write-Host "  [DROPPED] $($f.Name) - $($f.Value)" -ForegroundColor Red
        $dropped++
    }
}

Write-Host ""
Write-Host "--- API-Generated Fields ---" -ForegroundColor Yellow
foreach ($f in $apiFields.GetEnumerator() | Sort-Object Name) {
    if ($dbCols -contains $f.Name) {
        Write-Host "  [STORED]  $($f.Name) - $($f.Value)" -ForegroundColor Green
        $stored++
    } else {
        Write-Host "  [DROPPED] $($f.Name) - $($f.Value)" -ForegroundColor Red
        $dropped++
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Fields Stored:  $stored" -ForegroundColor Green
Write-Host "  Fields Dropped: $dropped" -ForegroundColor $(if ($dropped -gt 0) { "Red" } else { "Green" })

if ($dropped -gt 0) {
    Write-Host ""
    Write-Host "  ** ACTION REQUIRED: $dropped fields are passed by the wizard **" -ForegroundColor Red
    Write-Host "  ** but have no DB column - data is silently lost! **" -ForegroundColor Red
    Write-Host "  ** Run migration 047_specialty_template_versioning.sql **" -ForegroundColor Yellow
} else {
    Write-Host "  ** All fields properly stored! **" -ForegroundColor Green
}
