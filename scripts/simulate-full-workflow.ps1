# Full End-to-End NHIS Workflow Simulation
# Creates test patients and referrals, then processes them through the workflow

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
Write-Host "   FULL NHIS WORKFLOW SIMULATION" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan

# Setup - get required IDs
$staff = Invoke-RestMethod -Uri "${SUPABASE_URL}/staff?select=id,user_id`&user_id=not.is.null`&limit=1" -Headers $headers
$staffUserId = $staff[0].user_id
$staffId = $staff[0].id

$clinic = Invoke-RestMethod -Uri "${SUPABASE_URL}/clinics?select=id,clinic_name`&limit=1" -Headers $headers
$clinicId = $clinic[0].id

Write-Host "[SETUP] Staff ID: $staffId" -ForegroundColor Gray
Write-Host "[SETUP] Clinic: $($clinic[0].clinic_name)" -ForegroundColor Gray

# =============================================
# STEP 1: Create Test NHIS Patient
# =============================================
Write-Host "`n--- STEP 1: CREATE TEST NHIS PATIENT ---" -ForegroundColor Magenta

$patientBody = @{
    first_name = "Test"
    surname = "NHISPatient"
    middle_name = "Workflow"
    gender = "Male"
    date_of_birth = "1990-01-15"
    patient_category = "Civilian"
    insurance_type = "Civilian_NHIS"
    nhis_number = "NHIS/TEST/$(Get-Date -Format 'yyyyMMddHHmmss')"
    contact_phone = "08012345678"
    status = "Active"
} | ConvertTo-Json

$patient = Invoke-RestMethod -Uri "${SUPABASE_URL}/patients" -Method POST -Headers $headers -Body $patientBody
Write-Host "[1] Created Patient: $($patient.id)" -ForegroundColor Green
Write-Host "    Name: $($patient.first_name) $($patient.surname)" -ForegroundColor Gray
Write-Host "    NHIS: $($patient.nhis_number)" -ForegroundColor Gray

# =============================================
# STEP 2: Create External Referral in Queue
# =============================================
Write-Host "`n--- STEP 2: CREATE EXTERNAL REFERRAL ---" -ForegroundColor Magenta

$extReferralBody = @{
    patient_id = $patient.id
    request_type = "external_referral"
    referral_code = "REF-$(Get-Date -Format 'yyyyMMddHHmmss')"
    referral_date = (Get-Date -Format "yyyy-MM-dd")
    referral_source = "General Hospital Lagos"
    clinical_basis = "Patient referred for specialist consultation - hypertension management"
    referring_clinician = "Dr. External Physician"
    priority = "normal"
    requested_by = $staffId
    status = "pending"
    target_clinic_id = $clinicId
    chief_complaint = "High blood pressure, persistent headaches"
} | ConvertTo-Json

$extQueue = Invoke-RestMethod -Uri "${SUPABASE_URL}/nhis_referral_queue" -Method POST -Headers $headers -Body $extReferralBody
Write-Host "[2] Created External Referral Queue Item: $($extQueue.id)" -ForegroundColor Green

# =============================================
# STEP 3: NHIS Officer Approves External Referral
# =============================================
Write-Host "`n--- STEP 3: NHIS APPROVAL (EXTERNAL) ---" -ForegroundColor Magenta

$approveBody = @{
    p_queue_id = $extQueue.id
    p_action = "approve"
    p_processed_by = $staffUserId
    p_notes = "Patient verified. Referral documents confirmed."
    p_auth_code = "AUTH-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

$approveResult = Invoke-RestMethod -Uri "${SUPABASE_URL}/rpc/process_nhis_referral_queue" -Method POST -Headers $headers -Body $approveBody
Write-Host "[3] Approval Result:" -ForegroundColor $(if($approveResult.success){"Green"}else{"Red"})
Write-Host "    Success: $($approveResult.success)" -ForegroundColor Gray
Write-Host "    Encounter: $($approveResult.encounter_number)" -ForegroundColor Gray
Write-Host "    Next Queue: $($approveResult.next_queue)" -ForegroundColor Gray

$encounterId = $approveResult.encounter_id

# =============================================
# STEP 4: Verify Patient in Billing Queue
# =============================================
Write-Host "`n--- STEP 4: VERIFY BILLING QUEUE ---" -ForegroundColor Magenta

$billingQueue = Invoke-RestMethod -Uri "${SUPABASE_URL}/queue?encounter_id=eq.${encounterId}`&select=id,location,status,notes" -Headers $headers
if ($billingQueue.Count -gt 0) {
    Write-Host "[4] VERIFIED: Patient in $($billingQueue[0].location) queue" -ForegroundColor Green
    Write-Host "    Status: $($billingQueue[0].status)" -ForegroundColor Gray
} else {
    Write-Host "[4] ERROR: Patient not found in any queue!" -ForegroundColor Red
}

# =============================================
# STEP 5: Billing Verifies and Routes to Consultation
# =============================================
Write-Host "`n--- STEP 5: BILLING VERIFICATION ---" -ForegroundColor Magenta

if ($billingQueue.Count -gt 0) {
    # Update queue to complete billing and route to Consultation
    $updateBody = @{
        status = "Completed"
        completed_at = (Get-Date -Format "o")
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "${SUPABASE_URL}/queue?id=eq.$($billingQueue[0].id)" -Method PATCH -Headers $headers -Body $updateBody | Out-Null
    
    # Create new queue entry for Consultation
    $consultQueueBody = @{
        patient_id = $patient.id
        encounter_id = $encounterId
        visit_id = $encounterId
        clinic_id = $clinicId
        location = "Consultation"
        status = "Waiting"
        priority = "Normal"
        ticket_number = "Q-$(Get-Random -Minimum 1000 -Maximum 9999)"
        notes = "From Billing - Payment verified"
    } | ConvertTo-Json
    
    $consultQueue = Invoke-RestMethod -Uri "${SUPABASE_URL}/queue" -Method POST -Headers $headers -Body $consultQueueBody
    Write-Host "[5] Patient routed to Consultation queue" -ForegroundColor Green
    Write-Host "    Queue ID: $($consultQueue.id)" -ForegroundColor Gray
}

# =============================================
# WORKFLOW SUMMARY
# =============================================
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   EXTERNAL REFERRAL WORKFLOW COMPLETE" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan

Write-Host "WORKFLOW PATH:" -ForegroundColor Yellow
Write-Host "  1. External Referral Created" -ForegroundColor Gray
Write-Host "  2. NHIS Officer Approved -> Encounter Created" -ForegroundColor Gray
Write-Host "  3. Patient Routed to Billing Queue" -ForegroundColor Gray
Write-Host "  4. Billing Verified -> Patient Routed to Consultation" -ForegroundColor Gray
Write-Host ""
Write-Host "Patient: $($patient.first_name) $($patient.surname)" -ForegroundColor Green
Write-Host "Encounter: $($approveResult.encounter_number)" -ForegroundColor Green
Write-Host "Current Location: Consultation" -ForegroundColor Green

# =============================================
# NOW TEST INTERNAL REFERRAL
# =============================================
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   INTERNAL REFERRAL WORKFLOW TEST" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan

# Create a clinical_request for specialty referral
Write-Host "--- Creating Internal Specialty Referral ---" -ForegroundColor Magenta

# First create an encounter for the source
$encounterBody = @{
    patient_id = $patient.id
    clinic_id = $clinicId
    visit_type = "New Visit"
    status = "Active"
    encounter_date = (Get-Date -Format "yyyy-MM-dd")
    payment_category = "NHIS"
    insurance_type = "Civilian_NHIS"
    chief_complaint = "Dental pain requiring specialist attention"
} | ConvertTo-Json

$sourceEnc = Invoke-RestMethod -Uri "${SUPABASE_URL}/visits" -Method POST -Headers $headers -Body $encounterBody
Write-Host "[I.1] Created source encounter: $($sourceEnc.encounter_number)" -ForegroundColor Green

# Create specialty referral clinical_request
$crBody = @{
    patient_id = $patient.id
    encounter_id = $sourceEnc.id
    request_type = "Referral"
    specialty_module = "dental"
    clinical_reason = "Severe tooth decay requiring extraction"
    notes = "Patient reports pain for 2 weeks"
    urgency = "Routine"
    requesting_doctor_id = $staffId
    status = "Pending"
    nhis_approval_status = "pending"
    referral_workflow_status = "Pending_Encounter_Office"
} | ConvertTo-Json

$clinicalRequest = Invoke-RestMethod -Uri "${SUPABASE_URL}/clinical_requests" -Method POST -Headers $headers -Body $crBody
Write-Host "[I.2] Created clinical_request: $($clinicalRequest.id)" -ForegroundColor Green
Write-Host "      Specialty: $($clinicalRequest.specialty_module)" -ForegroundColor Gray

# Create linked nhis_referral_queue entry
$intQueueBody = @{
    patient_id = $patient.id
    request_type = "internal_nhis_approval"
    clinical_request_id = $clinicalRequest.id
    clinical_basis = "Internal dental referral"
    priority = "normal"
    requested_by = $staffId
    status = "pending"
    target_clinic_id = $clinicId
} | ConvertTo-Json

$intQueue = Invoke-RestMethod -Uri "${SUPABASE_URL}/nhis_referral_queue" -Method POST -Headers $headers -Body $intQueueBody
Write-Host "[I.3] Created NHIS queue item: $($intQueue.id)" -ForegroundColor Green
Write-Host "      Linked to clinical_request: $($intQueue.clinical_request_id)" -ForegroundColor Gray

# NHIS Officer approves
$intApproveBody = @{
    p_queue_id = $intQueue.id
    p_action = "approve"
    p_processed_by = $staffUserId
    p_notes = "Internal specialty referral approved"
} | ConvertTo-Json

$intResult = Invoke-RestMethod -Uri "${SUPABASE_URL}/rpc/process_nhis_referral_queue" -Method POST -Headers $headers -Body $intApproveBody
Write-Host "[I.4] Internal Referral Approval:" -ForegroundColor $(if($intResult.success){"Green"}else{"Red"})
Write-Host "      $($intResult.message)" -ForegroundColor Gray

# Verify clinical_request status
$crCheck = Invoke-RestMethod -Uri "${SUPABASE_URL}/clinical_requests?id=eq.$($clinicalRequest.id)`&select=nhis_approval_status,referral_workflow_status" -Headers $headers
Write-Host "[I.5] Clinical Request Status:" -ForegroundColor Cyan
Write-Host "      NHIS Approval: $($crCheck[0].nhis_approval_status)" -ForegroundColor $(if($crCheck[0].nhis_approval_status -eq "approved"){"Green"}else{"Yellow"})
Write-Host "      Workflow: $($crCheck[0].referral_workflow_status)" -ForegroundColor $(if($crCheck[0].referral_workflow_status -eq "Pending_Encounter_Office"){"Green"}else{"Yellow"})

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   ALL WORKFLOW TESTS COMPLETE" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan
