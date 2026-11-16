# Test Atomic RPC
$h = @{apikey=$env:SUPABASE_KEY;Authorization="Bearer $env:SUPABASE_KEY";"Content-Type"="application/json"}

Write-Host "Testing verify_payment_and_route RPC..." -ForegroundColor Cyan

# Test with invalid UUID to see RPC response
$body = '{"p_billing_id":"00000000-0000-0000-0000-000000000001","p_payment_method":"Cash"}'

try {
    $result = Invoke-RestMethod "$env:SUPABASE_URL/rest/v1/rpc/verify_payment_and_route" -Method POST -Headers $h -Body $body
    Write-Host "RPC Response:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode"
    
    if ($statusCode -eq 404) {
        Write-Host "RPC NOT FOUND - Migration 130 not yet applied" -ForegroundColor Red
    } elseif ($statusCode -eq 400) {
        Write-Host "RPC EXISTS but returned error (expected for invalid UUID)" -ForegroundColor Green
        # Try to get error details
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error details: $errorBody" -ForegroundColor Yellow
        } catch {}
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
