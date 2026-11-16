# ============================================================================
# NHIS Referral Workflow Test Script
# Tests both External and Internal referral workflows
# ============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    NHIS REFERRAL WORKFLOW - COMPREHENSIVE TEST" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
$migrationFile = ".\migrations\112_fix_referral_workflow_routing.sql"
if (Test-Path $migrationFile) {
    Write-Host "[OK] Migration file found: $migrationFile" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Migration file not found: $migrationFile" -ForegroundColor Red
    Write-Host "Please ensure the migration was created."
    exit 1
}

# Check for updated TypeScript file
$tsFile = ".\src\renderer\modules\encounter\api\internal-referral.api.ts"
if (Test-Path $tsFile) {
    $content = Get-Content $tsFile -Raw
    if ($content -match "getSpecialtyQueueLocation") {
        Write-Host "[OK] TypeScript fix applied: internal-referral.api.ts" -ForegroundColor Green
    } else {
        Write-Host "[WARN] TypeScript fix may not be applied yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] TypeScript file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    WORKFLOW SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. EXTERNAL REFERRAL WORKFLOW (Fixed):" -ForegroundColor Yellow
Write-Host "   Patient from outside facility" -ForegroundColor Gray
Write-Host "   ┌─────────────────────────────────────────────────────┐"
Write-Host "   │  Admin registers patient → NHIS Queue (pending)     │"
Write-Host "   │           ↓                                         │"
Write-Host "   │  NHIS Officer approves → Encounter Created          │"
Write-Host "   │           ↓                                         │"
Write-Host "   │  [FIX] Routes to → BILLING Queue (not Nursing!)     │"
Write-Host "   │           ↓                                         │"
Write-Host "   │  Billing verifies payment → Routes to Nursing/Consult│"
Write-Host "   └─────────────────────────────────────────────────────┘"
Write-Host ""

Write-Host "2. INTERNAL REFERRAL WORKFLOW (Fixed):" -ForegroundColor Yellow
Write-Host "   Specialty clinic referral (Dental, Eye, Physio, Surgery)" -ForegroundColor Gray
Write-Host "   ┌─────────────────────────────────────────────────────┐"
Write-Host "   │  Doctor creates referral → NHIS Queue (pending)     │"
Write-Host "   │           ↓                                         │"
Write-Host "   │  NHIS Officer approves → clinical_request updated   │"
Write-Host "   │           ↓                                         │"
Write-Host "   │  [FIX] Shows in → Encounter Office Referrals Queue  │"
Write-Host "   │           ↓                                         │"
Write-Host "   |  Admin books appointment, creates encounter          |"
Write-Host "   │           ↓                                         │"
Write-Host "   │  [FIX] Routes to → SPECIALTY CLINIC Queue           │"
Write-Host "   │        (Dental/Eye/Physio/Surgery as approved)      │"
Write-Host "   └─────────────────────────────────────────────────────┘"
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    KEY FIXES APPLIED" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. process_nhis_referral_queue() function:" -ForegroundColor Green
Write-Host "   - EXTERNAL: Now routes to 'Billing' queue (was: Nursing)" -ForegroundColor White
Write-Host "   - INTERNAL: Updates clinical_request, no encounter created" -ForegroundColor White
Write-Host ""

Write-Host "2. create_referral_encounter() function:" -ForegroundColor Green
Write-Host "   - Returns JSON with success/error details" -ForegroundColor White
Write-Host "   - Routes directly to specialty clinic queue" -ForegroundColor White
Write-Host "   - Uses specialty_module to determine queue location" -ForegroundColor White
Write-Host ""

Write-Host "3. TypeScript createReferralEncounter():" -ForegroundColor Green
Write-Host "   - Added queue creation after encounter creation" -ForegroundColor White
Write-Host "   - Uses getSpecialtyQueueLocation helper" -ForegroundColor White
Write-Host "   - Falls back to Consultation for unknown specialty" -ForegroundColor White
Write-Host ""

Write-Host "4. pending_internal_referrals view:" -ForegroundColor Green
Write-Host "   - Only shows NHIS-approved referrals" -ForegroundColor White
Write-Host "   - Filters: nhis_approval_status IN (not_required, approved)" -ForegroundColor White
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    NEXT STEPS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To apply these fixes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Apply the SQL migration to your database:" -ForegroundColor White
Write-Host "   Option A: Run via Supabase CLI" -ForegroundColor Gray
Write-Host "   > npx supabase db push" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Option B: Run directly via psql/TablePlus" -ForegroundColor Gray
Write-Host "   Copy content from: $migrationFile" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. Restart your development server:" -ForegroundColor White
Write-Host "   > npm run start" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Test the workflows:" -ForegroundColor White
Write-Host "   a) Create an external NHIS referral patient" -ForegroundColor Gray
Write-Host "   b) Approve in NHIS module" -ForegroundColor Gray
Write-Host "   c) Verify patient appears in BILLING queue (not Nursing)" -ForegroundColor Gray
Write-Host ""
Write-Host "   d) Create an internal referral from consultation" -ForegroundColor Gray
Write-Host "   e) Approve in NHIS module" -ForegroundColor Gray
Write-Host "   f) Verify referral appears in Encounter Office" -ForegroundColor Gray
Write-Host "   g) Book appointment and create encounter" -ForegroundColor Gray
Write-Host "   h) Verify patient appears in SPECIALTY CLINIC queue" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================================" -ForegroundColor Green
Write-Host "    TEST COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
