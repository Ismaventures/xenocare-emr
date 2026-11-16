# NHIS Workflow Test Script
# Tests both External and Internal referral workflows

$ErrorActionPreference = "Stop"

$SUPABASE_URL = "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1"
$SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   NHIS WORKFLOW TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Get a staff user_id for processing
Write-Host "[1] Getting staff user for processing..." -ForegroundColor Yellow
$staff = Invoke-RestMethod -Uri "$SUPABASE_URL/staff?select=id,user_id&user_id=not.is.null&limit=1" -Headers $headers
if ($staff.Count -eq 0) {
    Write-Host "ERROR: No staff with user_id found!" -ForegroundColor Red
    exit 1
}
$staffUserId = $staff[0].user_id
Write-Host "    Staff User ID: $staffUserId" -ForegroundColor Green

# 2. Check pending queue items
Write-Host "`n[2] Checking pending NHIS referral queue..." -ForegroundColor Yellow
$pending = Invoke-RestMethod -Uri "$SUPABASE_URL/nhis_referral_queue?status=eq.pending&select=id,patient_id,request_type,status,target_clinic_id" -Headers $headers
Write-Host "    Pending items: $($pending.Count)" -ForegroundColor Green

if ($pending.Count -eq 0) {
    Write-Host "    No pending items to test. Creating test data..." -ForegroundColor Yellow
    exit 0
}

# Find external and internal referrals
$externalRef = $pending | Where-Object { $_.request_type -eq "external_referral" } | Select-Object -First 1
$internalRef = $pending | Where-Object { $_.request_type -eq "internal_nhis_approval" } | Select-Object -First 1

# 3. Test External Referral Approval
if ($externalRef) {
    Write-Host "`n[3] TESTING EXTERNAL REFERRAL APPROVAL" -ForegroundColor Magenta
    Write-Host "    Queue ID: $($externalRef.id)" -ForegroundColor Gray
    
    $body = @{
        p_queue_id = $externalRef.id
        p_action = "approve"
        p_processed_by = $staffUserId
        p_notes = "PowerShell test approval"
        p_auth_code = "AUTH-PS-$(Get-Date -Format 'yyyyMMddHHmmss')"
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$SUPABASE_URL/rpc/process_nhis_referral_queue" -Method POST -Headers $headers -Body $body
        Write-Host "    Result: $($result | ConvertTo-Json -Compress)" -ForegroundColor Green
        
        if ($result.success -eq $true) {
            Write-Host "    SUCCESS! Encounter: $($result.encounter_number)" -ForegroundColor Green
            Write-Host "    Next Queue: $($result.next_queue)" -ForegroundColor Green
            
            # Verify queue entry
            $queueCheck = Invoke-RestMethod -Uri "$SUPABASE_URL/queue?encounter_id=eq.$($result.encounter_id)&select=id,location,status" -Headers $headers
            if ($queueCheck.Count -gt 0) {
                Write-Host "    Queue Location: $($queueCheck[0].location) - Status: $($queueCheck[0].status)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "    FAILED: $($result.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "    ERROR: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n[3] No external referral to test" -ForegroundColor Gray
}

# 4. Test Internal Referral Approval
if ($internalRef) {
    Write-Host "`n[4] TESTING INTERNAL REFERRAL APPROVAL" -ForegroundColor Magenta
    Write-Host "    Queue ID: $($internalRef.id)" -ForegroundColor Gray
    
    $body = @{
        p_queue_id = $internalRef.id
        p_action = "approve"
        p_processed_by = $staffUserId
        p_notes = "PowerShell test approval - internal"
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$SUPABASE_URL/rpc/process_nhis_referral_queue" -Method POST -Headers $headers -Body $body
        Write-Host "    Result: $($result | ConvertTo-Json -Compress)" -ForegroundColor Green
        
        if ($result.success -eq $true) {
            Write-Host "    SUCCESS! Type: $($result.request_type)" -ForegroundColor Green
            Write-Host "    Message: $($result.message)" -ForegroundColor Green
        } else {
            Write-Host "    FAILED: $($result.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "    ERROR: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n[4] No internal referral to test" -ForegroundColor Gray
}

# 5. Verify Queue State
Write-Host "`n[5] VERIFYING QUEUE STATE" -ForegroundColor Yellow
$billingQueue = Invoke-RestMethod -Uri "$SUPABASE_URL/queue?location=eq.Billing&status=eq.Waiting&select=id,patient_id,location,notes&order=created_at.desc&limit=5" -Headers $headers
Write-Host "    Billing Queue (Waiting): $($billingQueue.Count) patients" -ForegroundColor Green
$billingQueue | ForEach-Object { Write-Host "      - $($_.notes)" -ForegroundColor Gray }

# 6. Verify Encounters Created
Write-Host "`n[6] RECENT ENCOUNTERS" -ForegroundColor Yellow
$encounters = Invoke-RestMethod -Uri "$SUPABASE_URL/visits?select=id,encounter_number,visit_type,status,nhis_verification_status&order=created_at.desc&limit=5" -Headers $headers
$encounters | ForEach-Object { 
    Write-Host "    $($_.encounter_number) | $($_.visit_type) | NHIS: $($_.nhis_verification_status)" -ForegroundColor Gray 
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
