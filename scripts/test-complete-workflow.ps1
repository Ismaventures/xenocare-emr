# Complete NHIS Workflow Test
# Tests:
# 1. External referral: NHIS Approval → Billing → Consultation
# 2. Internal referral: NHIS Approval → Encounter Office → Specialty Clinic

$ErrorActionPreference = "Stop"

$SUPABASE_URL = "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1"
$SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   COMPLETE NHIS WORKFLOW VERIFICATION" -ForegroundColor Cyan  
Write-Host "=============================================`n" -ForegroundColor Cyan

# Get staff for testing
$staff = Invoke-RestMethod -Uri "$SUPABASE_URL/staff?select=id,user_id&user_id=not.is.null&limit=1" -Headers $headers
$staffUserId = $staff[0].user_id
$staffId = $staff[0].id
Write-Host "[SETUP] Staff: $staffId" -ForegroundColor Gray

# Get a clinic for testing
$clinic = Invoke-RestMethod -Uri "$SUPABASE_URL/clinics?select=id,clinic_name&limit=1" -Headers $headers
$clinicId = $clinic[0].id
Write-Host "[SETUP] Clinic: $($clinic[0].clinic_name)" -ForegroundColor Gray

# =============================================
# WORKFLOW 1: EXTERNAL REFERRAL
# =============================================
Write-Host "`n--- WORKFLOW 1: EXTERNAL REFERRAL ---" -ForegroundColor Magenta

# Check for existing external referral in queue
$extQueue = Invoke-RestMethod -Uri "$SUPABASE_URL/nhis_referral_queue?request_type=eq.external_referral&status=eq.pending&select=id,patient_id&limit=1" -Headers $headers

if ($extQueue.Count -gt 0) {
    Write-Host "[1.1] Found pending external referral: $($extQueue[0].id)" -ForegroundColor Yellow
    
    # Approve external referral
    $body = @{
        p_queue_id = $extQueue[0].id
        p_action = "approve"
        p_processed_by = $staffUserId
        p_notes = "Test external approval"
        p_auth_code = "EXT-$(Get-Date -Format 'yyyyMMddHHmmss')"
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$SUPABASE_URL/rpc/process_nhis_referral_queue" -Method POST -Headers $headers -Body $body
        Write-Host "[1.2] Approval Result: $($result.success)" -ForegroundColor $(if($result.success){"Green"}else{"Red"})
        
        if ($result.success) {
            Write-Host "      Encounter: $($result.encounter_number)" -ForegroundColor Green
            Write-Host "      Next Queue: $($result.next_queue)" -ForegroundColor Green
            
            # Verify patient is in Billing queue
            $billingCheck = Invoke-RestMethod -Uri "$SUPABASE_URL/queue?encounter_id=eq.$($result.encounter_id)&location=eq.Billing&select=id,status" -Headers $headers
            if ($billingCheck.Count -gt 0) {
                Write-Host "[1.3] VERIFIED: Patient in Billing Queue" -ForegroundColor Green
            } else {
                Write-Host "[1.3] ERROR: Patient NOT in Billing Queue" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "[1.2] ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[1.1] No pending external referrals found" -ForegroundColor Gray
}

# =============================================
# WORKFLOW 2: INTERNAL REFERRAL (SPECIALTY)
# =============================================
Write-Host "`n--- WORKFLOW 2: INTERNAL REFERRAL (SPECIALTY) ---" -ForegroundColor Magenta

# Check for existing internal referral in queue with clinical_request_id
$intQueue = Invoke-RestMethod -Uri "$SUPABASE_URL/nhis_referral_queue?request_type=eq.internal_nhis_approval&status=eq.pending&clinical_request_id=not.is.null&select=id,patient_id,clinical_request_id&limit=1" -Headers $headers

if ($intQueue.Count -eq 0) {
    Write-Host "[2.0] No linked internal referral found. Checking clinical_requests..." -ForegroundColor Yellow
    
    # Find a pending NHIS referral in clinical_requests
    $pendingCR = Invoke-RestMethod -Uri "$SUPABASE_URL/clinical_requests?request_type=eq.Referral&nhis_approval_status=eq.pending&select=id,patient_id,specialty_module&limit=1" -Headers $headers
    
    if ($pendingCR.Count -gt 0) {
        Write-Host "[2.0a] Found pending clinical_request: $($pendingCR[0].id) ($($pendingCR[0].specialty_module))" -ForegroundColor Yellow
        
        # Create linked nhis_referral_queue entry
        $createBody = @{
            patient_id = $pendingCR[0].patient_id
            request_type = "internal_nhis_approval"
            clinical_request_id = $pendingCR[0].id
            clinical_basis = "Internal specialty referral - $($pendingCR[0].specialty_module)"
            priority = "normal"
            requested_by = $staffId
            status = "pending"
        } | ConvertTo-Json
        
        try {
            $newQueue = Invoke-RestMethod -Uri "$SUPABASE_URL/nhis_referral_queue" -Method POST -Headers $headers -Body $createBody
            Write-Host "[2.0b] Created linked queue item: $($newQueue.id)" -ForegroundColor Green
            $intQueue = @($newQueue)
        } catch {
            Write-Host "[2.0b] Error creating queue item: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "[2.0] No pending specialty referrals in clinical_requests" -ForegroundColor Gray
    }
}

if ($intQueue.Count -gt 0) {
    Write-Host "[2.1] Processing internal referral: $($intQueue[0].id)" -ForegroundColor Yellow
    Write-Host "      Clinical Request ID: $($intQueue[0].clinical_request_id)" -ForegroundColor Gray
    
    # Approve internal referral
    $body = @{
        p_queue_id = $intQueue[0].id
        p_action = "approve"
        p_processed_by = $staffUserId
        p_notes = "Test internal approval"
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$SUPABASE_URL/rpc/process_nhis_referral_queue" -Method POST -Headers $headers -Body $body
        Write-Host "[2.2] Approval Result: $($result.success)" -ForegroundColor $(if($result.success){"Green"}else{"Red"})
        Write-Host "      Message: $($result.message)" -ForegroundColor Green
        
        if ($result.success -and $intQueue[0].clinical_request_id) {
            # Verify clinical_request was updated
            $crCheck = Invoke-RestMethod -Uri "$SUPABASE_URL/clinical_requests?id=eq.$($intQueue[0].clinical_request_id)&select=nhis_approval_status,referral_workflow_status" -Headers $headers
            if ($crCheck.Count -gt 0) {
                Write-Host "[2.3] Clinical Request Status:" -ForegroundColor Cyan
                Write-Host "      NHIS Approval: $($crCheck[0].nhis_approval_status)" -ForegroundColor $(if($crCheck[0].nhis_approval_status -eq "approved"){"Green"}else{"Yellow"})
                Write-Host "      Workflow: $($crCheck[0].referral_workflow_status)" -ForegroundColor $(if($crCheck[0].referral_workflow_status -eq "Pending_Encounter_Office"){"Green"}else{"Yellow"})
            }
        }
    } catch {
        Write-Host "[2.2] ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# =============================================
# SUMMARY
# =============================================
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   WORKFLOW SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan

# Queue Summary
$billingQ = Invoke-RestMethod -Uri "$SUPABASE_URL/queue?location=eq.Billing&status=eq.Waiting&select=id" -Headers $headers
$nursingQ = Invoke-RestMethod -Uri "$SUPABASE_URL/queue?location=eq.Nursing&status=eq.Waiting&select=id" -Headers $headers
$consultQ = Invoke-RestMethod -Uri "$SUPABASE_URL/queue?location=eq.Consultation&status=eq.Waiting&select=id" -Headers $headers

Write-Host "Queue Status:" -ForegroundColor Yellow
Write-Host "  Billing:      $($billingQ.Count) waiting" -ForegroundColor Gray
Write-Host "  Nursing:      $($nursingQ.Count) waiting" -ForegroundColor Gray
Write-Host "  Consultation: $($consultQ.Count) waiting" -ForegroundColor Gray

# Pending Referrals in Encounter Office
$pendingEO = Invoke-RestMethod -Uri "$SUPABASE_URL/clinical_requests?request_type=eq.Referral&nhis_approval_status=eq.approved&referral_workflow_status=eq.Pending_Encounter_Office&select=id" -Headers $headers
Write-Host "`nEncounter Office:" -ForegroundColor Yellow
Write-Host "  Pending Referrals: $($pendingEO.Count)" -ForegroundColor Gray

Write-Host "`n[DONE] Workflow verification complete." -ForegroundColor Cyan
