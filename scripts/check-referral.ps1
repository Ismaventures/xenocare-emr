# Check internal referral status
$headers = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
}

Write-Host "=== NHIS Queue Item ===" -ForegroundColor Cyan
$item = Invoke-RestMethod -Uri "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1/nhis_referral_queue?id=eq.fbbe5d37-e3e2-45e3-bd6c-7d3dd81fff78&select=*" -Headers $headers
Write-Host "Status: $($item[0].status)"
Write-Host "Request Type: $($item[0].request_type)"  
Write-Host "Clinical Request ID: $($item[0].clinical_request_id)"

Write-Host "`n=== All Referral Clinical Requests ===" -ForegroundColor Cyan
$cr = Invoke-RestMethod -Uri "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1/clinical_requests?request_type=eq.Referral&select=id,request_number,nhis_approval_status,referral_workflow_status,specialty_module&limit=10&order=created_at.desc" -Headers $headers
$cr | ForEach-Object { 
    Write-Host "$($_.request_number) | NHIS: $($_.nhis_approval_status) | Workflow: $($_.referral_workflow_status) | $($_.specialty_module)" 
}
