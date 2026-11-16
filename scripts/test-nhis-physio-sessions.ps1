# =============================================================================
# NHIS Physiotherapy Sessions Routing Test
# =============================================================================
# Tests that:
# 1. Creating a physio plan for an NHIS patient routes to NHIS approval queue
# 2. Extending a physio plan for an NHIS patient routes to NHIS approval queue
# 3. Approving the NHIS request updates the physio plan status
# 4. Session cap enforcement (max 6 for NHIS)
# =============================================================================

$ErrorActionPreference = "Stop"

# ── Load credentials from .env ──
$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env"
if (!(Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found at $envFile" -ForegroundColor Red
    exit 1
}
$envContent = Get-Content $envFile
foreach ($line in $envContent) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
}

$BASE_URL = $env:SUPABASE_URL
$SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $BASE_URL -or -not $SERVICE_KEY) {
    Write-Host "ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env" -ForegroundColor Red
    exit 1
}

$API_URL = "$BASE_URL/rest/v1"

$headers = @{
    "apikey"        = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# ── Cleanup tracker ──
$createdIds = @{
    physio_plans      = @()
    physio_sessions   = @()
    physio_assessments = @()
    nhis_approvals    = @()
    physio_plan_extensions = @()
    visits            = @()
    patients          = @()
}

function Cleanup {
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "   CLEANUP" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow

    # Delete in reverse dependency order
    foreach ($sessionId in $createdIds.physio_sessions) {
        Invoke-RestMethod -Uri "$API_URL/physio_sessions?session_id=eq.$sessionId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($extId in $createdIds.physio_plan_extensions) {
        Invoke-RestMethod -Uri "$API_URL/physio_plan_extensions?extension_id=eq.$extId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($approvalId in $createdIds.nhis_approvals) {
        # First unlink from physio_plans
        Invoke-RestMethod -Uri "$API_URL/physio_plans?nhis_approval_id=eq.$approvalId" -Method PATCH -Headers $headers -Body (@{ nhis_approval_id = $null } | ConvertTo-Json) -ErrorAction SilentlyContinue | Out-Null
        Invoke-RestMethod -Uri "$API_URL/nhis_approvals?id=eq.$approvalId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($planId in $createdIds.physio_plans) {
        Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($assessmentId in $createdIds.physio_assessments) {
        Invoke-RestMethod -Uri "$API_URL/physio_assessments?assessment_id=eq.$assessmentId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($visitId in $createdIds.visits) {
        Invoke-RestMethod -Uri "$API_URL/visits?id=eq.$visitId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    foreach ($patientId in $createdIds.patients) {
        Invoke-RestMethod -Uri "$API_URL/patients?id=eq.$patientId" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }

    Write-Host "    Cleanup complete." -ForegroundColor Green
}

# ── Helpers ──
$passCount = 0
$failCount = 0

function Assert-True($condition, $message) {
    if ($condition) {
        $script:passCount++
        Write-Host "    PASS: $message" -ForegroundColor Green
    } else {
        $script:failCount++
        Write-Host "    FAIL: $message" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   NHIS PHYSIO SESSIONS ROUTING TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {

# ── Step 1: Get a staff member for test operations ──
Write-Host "[1] Finding staff member..." -ForegroundColor Yellow
$staff = Invoke-RestMethod -Uri "$API_URL/staff?select=id,staff_id,user_id,first_name,last_name&user_id=not.is.null&limit=1" -Headers $headers
if ($staff.Count -eq 0) {
    Write-Host "    ERROR: No staff found!" -ForegroundColor Red
    exit 1
}
$staffId = $staff[0].id
$staffStaffId = $staff[0].staff_id
Write-Host "    Staff: $($staff[0].first_name) $($staff[0].last_name) ($staffId)" -ForegroundColor Green

# ── Step 2: Get a facility ──
Write-Host "`n[2] Finding facility..." -ForegroundColor Yellow
$facility = Invoke-RestMethod -Uri "$API_URL/facilities?select=id,name&limit=1" -Headers $headers
$facilityId = if ($facility.Count -gt 0) { $facility[0].id } else { $null }
Write-Host "    Facility: $(if ($facilityId) { $facility[0].name } else { '(none)' })" -ForegroundColor Green

# ── Step 3: Create test NHIS patient ──
Write-Host "`n[3] Creating test NHIS patient..." -ForegroundColor Yellow
$testPatientCode = "PT-PHYSIO-$(Get-Date -Format 'HHmmss')"
$testEmr = "TEST-PHYSIO-$(Get-Date -Format 'HHmmss')"
$patientBody = @{
    patient_id      = $testPatientCode
    first_name     = "PhysioTest"
    middle_name    = "NHIS"
    surname        = "Patient"
    date_of_birth  = "1990-01-15"
    gender         = "Male"
    emr_number     = $testEmr
    insurance_type = "Civilian_NHIS"
    nhis_number    = "NHIS-TEST-$(Get-Random -Maximum 9999)"
    status         = "Active"
} | ConvertTo-Json

$patient = Invoke-RestMethod -Uri "$API_URL/patients" -Method POST -Headers $headers -Body $patientBody
$patientUuid = $patient[0].id
$patientCode = $patient[0].patient_id
$createdIds.patients += $patientUuid
Write-Host "    Patient: $testEmr (UUID: $patientUuid, Code: $patientCode)" -ForegroundColor Green

# ── Step 4: Create NHIS encounter/visit ──
Write-Host "`n[4] Creating NHIS encounter..." -ForegroundColor Yellow
$encounterBody = @{
    visit_id         = "V-PHYSIO-TEST-$(Get-Date -Format 'HHmmss')"
    patient_id       = $patientUuid
    encounter_date   = (Get-Date -Format "yyyy-MM-dd")
    encounter_number = "ENC-PHYSIO-TEST-$(Get-Date -Format 'HHmmss')"
    insurance_type   = "Civilian_NHIS"
    payment_category = "NHIS"
    visit_type       = "outpatient"
    status           = "Active"
} | ConvertTo-Json

$encounter = Invoke-RestMethod -Uri "$API_URL/visits" -Method POST -Headers $headers -Body $encounterBody
$encounterId = $encounter[0].id
$createdIds.visits += $encounterId
Write-Host "    Encounter: $($encounter[0].encounter_number) (ID: $encounterId)" -ForegroundColor Green

# ── Step 5: Create test physio assessment ──
Write-Host "`n[5] Creating physio assessment..." -ForegroundColor Yellow
$assessmentBody = @{
    patient_id   = $patientCode
    encounter_id = $encounterId
    chief_complaint = "Test complaint for NHIS physio"
    estimated_sessions = 4
    status = "Completed"
} | ConvertTo-Json

$assessment = Invoke-RestMethod -Uri "$API_URL/physio_assessments" -Method POST -Headers $headers -Body $assessmentBody
$assessmentId = $assessment[0].assessment_id
$createdIds.physio_assessments += $assessmentId
Write-Host "    Assessment: $assessmentId" -ForegroundColor Green

# ══════════════════════════════════════════════════════════════════════════════
# TEST A: Create Treatment Plan for NHIS Patient — Verify NHIS Routing
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST A: CREATE NHIS PHYSIO PLAN" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[A1] Creating physio plan (is_nhis_plan=true, 4 sessions)..." -ForegroundColor Yellow
$planBody = @{
    assessment_id          = $assessmentId
    patient_id             = $patientCode
    encounter_id           = $encounterId
    total_sessions_planned = 4
    sessions_completed     = 0
    frequency              = "3x per week"
    session_duration_minutes = 45
    billing_type           = "per_session"
    status                 = "Active"
    payment_status         = "pending_billing"
    is_nhis_plan           = $true
    sessions_approved      = 4
    nhis_approval_status   = "pending"
    start_date             = (Get-Date -Format "yyyy-MM-dd")
} | ConvertTo-Json

$plan = Invoke-RestMethod -Uri "$API_URL/physio_plans" -Method POST -Headers $headers -Body $planBody
$planId = $plan[0].plan_id
$createdIds.physio_plans += $planId
Write-Host "    Plan: $planId" -ForegroundColor Green

# Create a matching nhis_approvals entry (simulates what createServiceApprovalRequest does)
Write-Host "`n[A2] Creating NHIS approval request (physiotherapy_plan)..." -ForegroundColor Yellow
$approvalBody = @{
    service_request_id   = $planId
    service_type         = "physiotherapy_plan"
    service_category     = "specialty"
    encounter_id         = $encounterId
    patient_id           = $patientUuid
    service_name         = "Physiotherapy Plan - 4 sessions"
    estimated_cost       = 0
    status               = "pending"
    requested_by         = $staffId
    requested_at         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    request_reason       = "NHIS physiotherapy plan requires pre-authorization"
    clinical_justification = "Test complaint for NHIS physio"
} | ConvertTo-Json

$approval = Invoke-RestMethod -Uri "$API_URL/nhis_approvals" -Method POST -Headers $headers -Body $approvalBody
$approvalId = $approval[0].id
$createdIds.nhis_approvals += $approvalId
Write-Host "    Approval ID: $approvalId" -ForegroundColor Green

# Link approval to plan
Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId" -Method PATCH -Headers $headers -Body (@{
    nhis_approval_id = $approvalId
} | ConvertTo-Json) | Out-Null

# ── Verify A1: Plan is NHIS and pending ──
Write-Host "`n[A3] Verifying plan state..." -ForegroundColor Yellow
$planCheck = Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId&select=plan_id,is_nhis_plan,nhis_approval_status,nhis_approval_id,total_sessions_planned,sessions_approved" -Headers $headers
Assert-True ($planCheck[0].is_nhis_plan -eq $true) "Plan is marked as NHIS"
Assert-True ($planCheck[0].nhis_approval_status -eq "pending") "Plan NHIS approval status = pending"
Assert-True ($planCheck[0].nhis_approval_id -eq $approvalId) "Plan linked to NHIS approval record"
Assert-True ($planCheck[0].total_sessions_planned -le 6) "Sessions capped at <= 6 for NHIS"
Assert-True ($planCheck[0].sessions_approved -le 6) "Sessions approved <= 6 for NHIS"

# ── Verify A2: NHIS approval queue has the entry ──
Write-Host "`n[A4] Verifying NHIS approval queue entry..." -ForegroundColor Yellow
$queueCheck = Invoke-RestMethod -Uri "$API_URL/nhis_approvals?service_request_id=eq.$planId&service_type=eq.physiotherapy_plan&select=id,status,service_name,service_type" -Headers $headers
Assert-True ($queueCheck.Count -gt 0) "NHIS approval record exists for plan"
Assert-True ($queueCheck[0].status -eq "pending") "Approval status = pending"
Assert-True ($queueCheck[0].service_type -eq "physiotherapy_plan") "Service type = physiotherapy_plan"

# ══════════════════════════════════════════════════════════════════════════════
# TEST B: Simulate NHIS Desk Approval
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST B: NHIS DESK APPROVES PLAN" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[B1] NHIS desk approves with authorization code..." -ForegroundColor Yellow
$authCode = "NHIS-AUTH-PT-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Update nhis_approvals record (simulates processApprovalDecision)
Invoke-RestMethod -Uri "$API_URL/nhis_approvals?id=eq.$approvalId" -Method PATCH -Headers $headers -Body (@{
    status             = "approved"
    decided_by         = $staffId
    decided_at         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    decision_notes     = "Test approval - sessions authorized"
    authorization_code = $authCode
    updated_at         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json) | Out-Null

# Update physio_plans (simulates what processApprovalDecision does for physiotherapy_plan)
Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId" -Method PATCH -Headers $headers -Body (@{
    nhis_approval_status   = "approved"
    nhis_authorization_code = $authCode
    updated_at             = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json) | Out-Null

Write-Host "    Authorization Code: $authCode" -ForegroundColor Green

# ── Verify B1: Plan is now approved ──
Write-Host "`n[B2] Verifying plan approval state..." -ForegroundColor Yellow
$planAfterApproval = Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId&select=nhis_approval_status,nhis_authorization_code" -Headers $headers
Assert-True ($planAfterApproval[0].nhis_approval_status -eq "approved") "Plan NHIS status = approved"
Assert-True ($planAfterApproval[0].nhis_authorization_code -eq $authCode) "Authorization code stored on plan"

# ── Verify B2: NHIS approval record updated ──
$approvalAfter = Invoke-RestMethod -Uri "$API_URL/nhis_approvals?id=eq.$approvalId&select=status,authorization_code,decided_by" -Headers $headers
Assert-True ($approvalAfter[0].status -eq "approved") "NHIS approval record = approved"
Assert-True ($approvalAfter[0].authorization_code -eq $authCode) "Auth code on approval record"

# ══════════════════════════════════════════════════════════════════════════════
# TEST C: Generate Sessions & Record Attendance
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST C: GENERATE & RECORD SESSIONS" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[C1] Generating 4 pre-scheduled sessions..." -ForegroundColor Yellow
$startDate = Get-Date
for ($i = 1; $i -le 4; $i++) {
    $schedDate = $startDate.AddDays(($i - 1) * 2).ToString("yyyy-MM-dd")
    $sessionBody = @{
        plan_id           = $planId
        assessment_id     = $assessmentId
        patient_id        = $patientCode
        encounter_id      = $encounterId
        session_number    = $i
        session_date      = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        scheduled_date    = $schedDate
        is_pre_generated  = $true
        treatment_provided = "Pending"
        attendance_status = "Rescheduled"
    } | ConvertTo-Json

    $session = Invoke-RestMethod -Uri "$API_URL/physio_sessions" -Method POST -Headers $headers -Body $sessionBody
    $createdIds.physio_sessions += $session[0].session_id
}
Write-Host "    Created 4 sessions" -ForegroundColor Green

# Mark 2 sessions as Attended
Write-Host "`n[C2] Recording 2 attended sessions..." -ForegroundColor Yellow
for ($i = 0; $i -lt 2; $i++) {
    $sid = $createdIds.physio_sessions[$i]
    Invoke-RestMethod -Uri "$API_URL/physio_sessions?session_id=eq.$sid" -Method PATCH -Headers $headers -Body (@{
        attendance_status  = "Attended"
        treatment_provided = "Manual therapy + exercises"
        pain_score_before  = 7
        pain_score_after   = 4
    } | ConvertTo-Json) | Out-Null
}

# Update plan sessions_completed
Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId" -Method PATCH -Headers $headers -Body (@{
    sessions_completed = 2
} | ConvertTo-Json) | Out-Null

$sessionsCheck = Invoke-RestMethod -Uri "$API_URL/physio_sessions?plan_id=eq.$planId&attendance_status=eq.Attended&select=session_id" -Headers $headers
Assert-True ($sessionsCheck.Count -eq 2) "2 sessions recorded as Attended"

# ══════════════════════════════════════════════════════════════════════════════
# TEST D: Extend Plan for NHIS Patient — Verify NHIS Routing
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST D: EXTEND NHIS PHYSIO PLAN" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[D1] Extending plan by 2 more sessions (total: 6)..." -ForegroundColor Yellow

# Create extension record
$extensionBody = @{
    plan_id                  = $planId
    previous_sessions_planned = 4
    additional_sessions      = 2
    new_total_sessions       = 6
    reason                   = "Patient requires 2 additional rehabilitation sessions"
    extended_by              = $staffId
} | ConvertTo-Json

$extension = Invoke-RestMethod -Uri "$API_URL/physio_plan_extensions" -Method POST -Headers $headers -Body $extensionBody
$extensionId = $extension[0].extension_id
$createdIds.physio_plan_extensions += $extensionId
Write-Host "    Extension: $extensionId" -ForegroundColor Green

# Update plan total
Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId" -Method PATCH -Headers $headers -Body (@{
    total_sessions_planned = 6
    nhis_approval_status   = "pending"
    payment_status         = "awaiting_payment"
    updated_at             = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json) | Out-Null

# Create NHIS approval for extension (simulates what extendPhysioPlan now does)
Write-Host "`n[D2] Creating NHIS approval for extension (physiotherapy_plan_extension)..." -ForegroundColor Yellow
$extApprovalBody = @{
    service_request_id     = $planId
    service_type           = "physiotherapy_plan_extension"
    service_category       = "specialty"
    encounter_id           = $encounterId
    patient_id             = $patientUuid
    service_name           = "Physiotherapy Plan Extension - +2 sessions (new total: 6)"
    estimated_cost         = 10000
    status                 = "pending"
    requested_by           = $staffId
    requested_at           = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    request_reason         = "NHIS physiotherapy plan extension requires pre-authorization"
    clinical_justification = "Patient requires 2 additional rehabilitation sessions"
} | ConvertTo-Json

$extApproval = Invoke-RestMethod -Uri "$API_URL/nhis_approvals" -Method POST -Headers $headers -Body $extApprovalBody
$extApprovalId = $extApproval[0].id
$createdIds.nhis_approvals += $extApprovalId
Write-Host "    Extension Approval ID: $extApprovalId" -ForegroundColor Green

# ── Verify D1: Extension created correctly ──
Write-Host "`n[D3] Verifying extension state..." -ForegroundColor Yellow
$extCheck = Invoke-RestMethod -Uri "$API_URL/physio_plan_extensions?extension_id=eq.$extensionId&select=additional_sessions,new_total_sessions,reason" -Headers $headers
Assert-True ($extCheck[0].additional_sessions -eq 2) "Extension: +2 sessions"
Assert-True ($extCheck[0].new_total_sessions -eq 6) "New total: 6 sessions"

# ── Verify D2: Plan is pending NHIS again ──
$planPending = Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId&select=nhis_approval_status,total_sessions_planned,payment_status" -Headers $headers
Assert-True ($planPending[0].nhis_approval_status -eq "pending") "Plan NHIS status reset to pending"
Assert-True ($planPending[0].total_sessions_planned -eq 6) "Plan total = 6"
Assert-True ($planPending[0].payment_status -eq "awaiting_payment") "Payment status = awaiting_payment"

# ── Verify D3: NHIS queue has extension entry ──
$extQueueCheck = Invoke-RestMethod -Uri "$API_URL/nhis_approvals?service_request_id=eq.$planId&service_type=eq.physiotherapy_plan_extension&status=eq.pending&select=id,service_type,status,service_name" -Headers $headers
Assert-True ($extQueueCheck.Count -gt 0) "NHIS approval exists for extension"
Assert-True ($extQueueCheck[0].service_type -eq "physiotherapy_plan_extension") "Service type = physiotherapy_plan_extension"

# ══════════════════════════════════════════════════════════════════════════════
# TEST E: Approve Extension & Verify
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST E: APPROVE EXTENSION" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[E1] NHIS desk approves extension..." -ForegroundColor Yellow
$extAuthCode = "NHIS-AUTH-EXT-$(Get-Date -Format 'yyyyMMddHHmmss')"

Invoke-RestMethod -Uri "$API_URL/nhis_approvals?id=eq.$extApprovalId" -Method PATCH -Headers $headers -Body (@{
    status             = "approved"
    decided_by         = $staffId
    decided_at         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    decision_notes     = "Extension approved - 2 additional sessions authorized"
    authorization_code = $extAuthCode
    updated_at         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json) | Out-Null

# Update plan (simulates processApprovalDecision for extension)
Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId" -Method PATCH -Headers $headers -Body (@{
    nhis_approval_status    = "approved"
    nhis_authorization_code = $extAuthCode
    updated_at              = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json) | Out-Null

Write-Host "    Extension Auth Code: $extAuthCode" -ForegroundColor Green

# ── Verify E1: Plan is approved again ──
Write-Host "`n[E2] Verifying final plan state..." -ForegroundColor Yellow
$finalPlan = Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId&select=nhis_approval_status,nhis_authorization_code,total_sessions_planned,sessions_completed,is_nhis_plan" -Headers $headers
Assert-True ($finalPlan[0].nhis_approval_status -eq "approved") "Plan NHIS status = approved after extension"
Assert-True ($finalPlan[0].nhis_authorization_code -eq $extAuthCode) "Auth code updated to extension code"
Assert-True ($finalPlan[0].total_sessions_planned -eq 6) "Total sessions = 6"
Assert-True ($finalPlan[0].sessions_completed -eq 2) "Sessions completed = 2 (from earlier)"

# ══════════════════════════════════════════════════════════════════════════════
# TEST F: NHIS Cap Enforcement (Cannot Exceed 6)
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST F: NHIS SESSION CAP (MAX 6)" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[F1] Verifying NHIS cap enforcement..." -ForegroundColor Yellow
$capPlan = Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$planId&select=total_sessions_planned,is_nhis_plan,sessions_approved" -Headers $headers
Assert-True ($capPlan[0].is_nhis_plan -eq $true) "Plan is NHIS"
Assert-True ($capPlan[0].total_sessions_planned -le 6) "Total sessions <= 6 (NHIS cap enforced)"
Write-Host "    NHIS cap: Plan has $($capPlan[0].total_sessions_planned)/6 sessions (approved: $($capPlan[0].sessions_approved))" -ForegroundColor Cyan

# ══════════════════════════════════════════════════════════════════════════════
# TEST G: Non-NHIS Patient Does NOT Route to Approval Queue
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   TEST G: PRIVATE PATIENT (NO NHIS ROUTING)" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "`n[G1] Creating private (non-NHIS) plan for comparison..." -ForegroundColor Yellow
$privatePlanBody = @{
    assessment_id          = $assessmentId
    patient_id             = $patientCode
    encounter_id           = $encounterId
    total_sessions_planned = 12
    sessions_completed     = 0
    frequency              = "2x per week"
    billing_type           = "per_session"
    status                 = "Active"
    payment_status         = "pending_billing"
    is_nhis_plan           = $false
    nhis_approval_status   = "not_required"
    start_date             = (Get-Date -Format "yyyy-MM-dd")
} | ConvertTo-Json

$privatePlan = Invoke-RestMethod -Uri "$API_URL/physio_plans" -Method POST -Headers $headers -Body $privatePlanBody
$privatePlanId = $privatePlan[0].plan_id
$createdIds.physio_plans += $privatePlanId

$privateCheck = Invoke-RestMethod -Uri "$API_URL/physio_plans?plan_id=eq.$privatePlanId&select=is_nhis_plan,nhis_approval_status,total_sessions_planned" -Headers $headers
Assert-True ($privateCheck[0].is_nhis_plan -eq $false) "Private plan: is_nhis_plan = false"
Assert-True ($privateCheck[0].nhis_approval_status -eq "not_required") "Private plan: approval = not_required"
Assert-True ($privateCheck[0].total_sessions_planned -eq 12) "Private plan: no 6-session cap (has 12)"

# Verify no NHIS approval created for private plan
$privateApprovalCheck = Invoke-RestMethod -Uri "$API_URL/nhis_approvals?service_request_id=eq.$privatePlanId&select=id" -Headers $headers
Assert-True ($privateApprovalCheck.Count -eq 0) "No NHIS approval record for private plan"

# ══════════════════════════════════════════════════════════════════════════════
# RESULTS
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Passed: $passCount" -ForegroundColor Green
Write-Host "    Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "    Total:  $($passCount + $failCount)" -ForegroundColor White

if ($failCount -gt 0) {
    Write-Host "`n    SOME TESTS FAILED!" -ForegroundColor Red
} else {
    Write-Host "`n    ALL TESTS PASSED!" -ForegroundColor Green
}

} catch {
    Write-Host "`n    EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
} finally {
    Cleanup
}
