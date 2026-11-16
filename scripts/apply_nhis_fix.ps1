# PowerShell Script to Apply NHIS Fix to Supabase
# Run this script: .\scripts\apply_nhis_fix.ps1

$ErrorActionPreference = "Stop"

$SUPABASE_URL = "https://wseumhbzroyznxeuipwa.supabase.co"
$SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "============================================"
Write-Host "NHIS Referral Workflow Fix Script"
Write-Host "============================================"

# Step 1: Test a pending queue item
Write-Host "`n[Step 1] Checking for pending NHIS referral queue items..."

$pendingQuery = "$SUPABASE_URL/rest/v1/nhis_referral_queue?status=eq.pending&select=id,patient_id,request_type,status&limit=5"
try {
    $pendingItems = Invoke-RestMethod -Uri $pendingQuery -Method GET -Headers $headers
    Write-Host "Found $($pendingItems.Count) pending items"
    if ($pendingItems.Count -gt 0) {
        $pendingItems | ForEach-Object {
            Write-Host "  - ID: $($_.id), Type: $($_.request_type)"
        }
    }
} catch {
    Write-Host "Error checking queue: $($_.Exception.Message)"
}

# Step 2: Check billing_orders columns
Write-Host "`n[Step 2] Verifying billing_orders table structure..."

$billingCheck = "$SUPABASE_URL/rest/v1/billing_orders?select=id,order_number,source_module,status&limit=1"
try {
    $billingResult = Invoke-RestMethod -Uri $billingCheck -Method GET -Headers $headers
    Write-Host "billing_orders query successful - columns exist correctly"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

# Step 3: Check if queue table has the right locations
Write-Host "`n[Step 3] Checking queue table for Billing location..."

$queueCheck = "$SUPABASE_URL/rest/v1/queue?location=eq.Billing&select=id,patient_id,location,status&limit=3"
try {
    $queueResult = Invoke-RestMethod -Uri $queueCheck -Method GET -Headers $headers
    Write-Host "Found $($queueResult.Count) items in Billing queue"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

# Step 4: Instructions
Write-Host "`n============================================"
Write-Host "MANUAL FIX REQUIRED"
Write-Host "============================================"
Write-Host "The function needs to be updated in Supabase directly."
Write-Host ""
Write-Host "Please do the following:"
Write-Host "1. Go to: https://supabase.com/dashboard/project/wseumhbzroyznxeuipwa/sql/new"
Write-Host "2. Copy the contents of: scripts\FIX_APPLY_NOW.sql"
Write-Host "3. Paste and click 'Run'"
Write-Host ""
Write-Host "After applying, retry the NHIS approval in the app."
Write-Host "============================================"

# Open the Supabase SQL editor
$openUrl = Read-Host "Open Supabase SQL Editor in browser? (y/n)"
if ($openUrl -eq "y") {
    Start-Process "https://supabase.com/dashboard/project/wseumhbzroyznxeuipwa/sql/new"
}
