# Test clinical_request insert
$h = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$body = @{
    patient_id = "c0fc6646-eab4-4f4a-b629-f30a552f68b5"
    request_type = "Referral"
    specialty_module = "dental"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1/clinical_requests" -Method POST -Headers $h -Body $body
    Write-Host "Success: $($result | ConvertTo-Json -Compress)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Yellow
}
