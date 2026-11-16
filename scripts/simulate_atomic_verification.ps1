# Simulation Script for Atomic Payment Verification
# This script tests the verify_payment_and_route RPC

$h = @{
    apikey = $env:SUPABASE_KEY
    Authorization = "Bearer $env:SUPABASE_KEY"
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ATOMIC PAYMENT VERIFICATION SIMULATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Find an unpaid billing order
Write-Host "STEP 1: Finding unpaid billing order..." -ForegroundColor Yellow
$billings = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/billing_orders?limit=10" -Headers $h

$unpaid = $billings | Where-Object { $_.status -eq 'Unpaid' } | Select-Object -First 1

if (-not $unpaid) {
    Write-Host "No unpaid billing orders found. Creating a test scenario..." -ForegroundColor Red
    Write-Host "Using most recent billing order for demo instead." -ForegroundColor Yellow
    $unpaid = $billings | Select-Object -First 1
}

Write-Host "Found billing order:" -ForegroundColor Green
Write-Host "  ID: $($unpaid.id)"
Write-Host "  Order#: $($unpaid.order_number)"
Write-Host "  Status: $($unpaid.status)"
Write-Host "  Amount: $($unpaid.net_amount)"
Write-Host "  Encounter: $($unpaid.encounter_id)"

# Step 2: Get current visit state
Write-Host "`nSTEP 2: Checking current visit state..." -ForegroundColor Yellow
$encounterId = $unpaid.encounter_id
if ($encounterId) {
    $visit = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/visits?id=eq.$encounterId&select=id,current_stage,status" -Headers $h
    if ($visit) {
        Write-Host "Current visit state:" -ForegroundColor Green
        Write-Host "  Stage: $($visit.current_stage)"
        Write-Host "  Status: $($visit.status)"
    }
}

# Step 3: Check queue before
Write-Host "`nSTEP 3: Checking queue entries before verification..." -ForegroundColor Yellow
if ($encounterId) {
    $queueBefore = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/queue?encounter_id=eq.$encounterId&select=id,location,status,ticket_number" -Headers $h
    if ($queueBefore) {
        Write-Host "Existing queue entries:" -ForegroundColor Green
        $queueBefore | ForEach-Object { Write-Host "  - $($_.location): $($_.status) (Ticket: $($_.ticket_number))" }
    } else {
        Write-Host "  No queue entries found" -ForegroundColor Gray
    }
}

# Step 4: Call atomic verification RPC
Write-Host "`nSTEP 4: Calling verify_payment_and_route RPC..." -ForegroundColor Yellow
$idempotencyKey = "test-" + $unpaid.id + "-" + (Get-Date -Format "yyyyMMddHHmmss")
Write-Host "  Idempotency Key: $idempotencyKey"

$rpcBody = @{
    p_billing_id = $unpaid.id
    p_payment_method = "Cash"
    p_idempotency_key = $idempotencyKey
    p_verified_by_staff_id = "TEST-STAFF"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/rpc/verify_payment_and_route" -Method POST -Headers $h -Body $rpcBody
    Write-Host "`nRPC RESULT:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Host "`nRPC ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "The RPC may not be deployed yet. Run migration 130 first." -ForegroundColor Yellow
}

# Step 5: Verify state after
Write-Host "`nSTEP 5: Verifying state after RPC call..." -ForegroundColor Yellow

# Check billing order
$billingAfter = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/billing_orders?id=eq.$($unpaid.id)&select=status,payment_method" -Headers $h
Write-Host "Billing Order Status: $($billingAfter.status)" -ForegroundColor Green

# Check visit stage
if ($encounterId) {
    $visitAfter = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/visits?id=eq.$encounterId&select=current_stage" -Headers $h
    Write-Host "Visit Current Stage: $($visitAfter.current_stage)" -ForegroundColor Green
}

# Check queue after
if ($encounterId) {
    $queueAfter = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/queue?encounter_id=eq.$encounterId&status=eq.Waiting&select=id,location,ticket_number" -Headers $h
    if ($queueAfter) {
        Write-Host "New Queue Entry: $($queueAfter.location) - Ticket #$($queueAfter.ticket_number)" -ForegroundColor Green
    }
}

# Step 6: Test idempotency - call again with same key
Write-Host "`nSTEP 6: Testing idempotency (calling RPC again with same key)..." -ForegroundColor Yellow
try {
    $result2 = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/rpc/verify_payment_and_route" -Method POST -Headers $h -Body $rpcBody
    Write-Host "Second call result:" -ForegroundColor Green
    Write-Host "  Success: $($result2.success)"
    Write-Host "  Idempotent: $($result2.idempotent)"
    Write-Host "  Message: $($result2.message)"
} catch {
    Write-Host "Second call error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check for duplicates
if ($encounterId) {
    $allQueues = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/queue?encounter_id=eq.$encounterId&select=id,location,status" -Headers $h
    $waitingCount = ($allQueues | Where-Object { $_.status -eq 'Waiting' }).Count
    Write-Host "`nQueue Duplicate Check: $waitingCount waiting entries (should be 1)" -ForegroundColor $(if($waitingCount -eq 1){"Green"}else{"Red"})
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SIMULATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
