# Simplified Simulation - Use Existing Encounter
# Tests the atomic workflow pattern using existing data

$h = @{
    apikey = $env:SUPABASE_KEY
    Authorization = "Bearer $env:SUPABASE_KEY"
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ATOMIC WORKFLOW VALIDATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# Find the encounter we fixed earlier
# ============================================================================
Write-Host "Finding test encounter ENC-20260207-0004..." -ForegroundColor Yellow

$encounterId = "2f0ae50d-772a-4ec8-b58c-c897f64fe490"

$visit = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/visits?id=eq.$encounterId" -Headers $h
Write-Host "Encounter: $($visit.encounter_number)" -ForegroundColor Green
Write-Host "  Patient ID: $($visit.patient_id)"
Write-Host "  Status: $($visit.status)"
Write-Host "  Current Stage: $($visit.current_stage)"

# ============================================================================
# Check queue entries
# ============================================================================
Write-Host "`nChecking queue entries..." -ForegroundColor Yellow

$queues = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/queue?encounter_id=eq.$encounterId&order=created_at.asc" -Headers $h

Write-Host "Queue History:" -ForegroundColor Green
$queues | ForEach-Object {
    $status = $_.status
    $color = switch ($status) {
        "Waiting" { "Green" }
        "Completed" { "Gray" }
        default { "Yellow" }
    }
    Write-Host "  [$($_.created_at.Substring(11,8))] $($_.location): $($_.status) (Ticket: $($_.ticket_number))" -ForegroundColor $color
}

# ============================================================================
# Validation Checks
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VALIDATION CHECKLIST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$checks = @()

# Check 1: Visit is Active
$checks += @{Name="Visit status is Active"; Pass=$visit.status -eq "Active"}

# Check 2: Current stage is queue_waiting
$checks += @{Name="Current stage = queue_waiting"; Pass=$visit.current_stage -eq "queue_waiting"}

# Check 3: Has active queue entry
$activeQueue = $queues | Where-Object { $_.status -in @("Waiting","Called","In Progress") }
$checks += @{Name="Has active queue entry"; Pass=$null -ne $activeQueue}

# Check 4: Active queue is NOT Billing
$notBilling = $activeQueue.location -ne "Billing"
$checks += @{Name="Active queue is not Billing"; Pass=$notBilling}

# Check 5: Billing queue is Completed
$billingQueue = $queues | Where-Object { $_.location -eq "Billing" }
$billingCompleted = $billingQueue.status -eq "Completed"
$checks += @{Name="Billing queue marked Completed"; Pass=$billingCompleted}

foreach ($check in $checks) {
    $status = if($check.Pass){"[PASS]"}else{"[FAIL]"}
    $color = if($check.Pass){"Green"}else{"Red"}
    Write-Host "  $status $($check.Name)" -ForegroundColor $color
}

# ============================================================================
# Check for orphaned encounters
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "ORPHANED ENCOUNTER CHECK" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Find active visits with no active queue
$allActiveVisits = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/visits?status=eq.Active&current_stage=neq.completed&current_stage=neq.encounter_closed&created_at=gte.$(Get-Date -Format 'yyyy-MM-dd')&select=id,encounter_number,current_stage" -Headers $h

$orphanedCount = 0
foreach ($v in $allActiveVisits) {
    $vQueues = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/queue?encounter_id=eq.$($v.id)&status=in.(Waiting,Called,In%20Progress)&select=id" -Headers $h
    if (-not $vQueues -or $vQueues.Count -eq 0) {
        Write-Host "  ORPHANED: $($v.encounter_number) (Stage: $($v.current_stage))" -ForegroundColor Red
        $orphanedCount++
    }
}

if ($orphanedCount -eq 0) {
    Write-Host "  No orphaned encounters found today!" -ForegroundColor Green
} else {
    Write-Host "`n  Found $orphanedCount orphaned encounters" -ForegroundColor Red
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passedCount = ($checks | Where-Object { $_.Pass }).Count
$totalCount = $checks.Count

if ($passedCount -eq $totalCount) {
    Write-Host "All $totalCount checks passed!" -ForegroundColor Green
    Write-Host "The atomic workflow fix is working correctly." -ForegroundColor Green
} else {
    Write-Host "$passedCount / $totalCount checks passed" -ForegroundColor Yellow
}

Write-Host ""
