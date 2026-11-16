# Check Internal Referrals Status
$headers = @{
    'apikey' = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    'Content-Type' = 'application/json'
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INTERNAL REFERRALS STATUS CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check pending internal referrals view
Write-Host "`n1. Pending Internal Referrals (Ready for Encounter Office):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri 'https://wseumhbzroyznxeuipwa.supabase.co/rest/v1/pending_internal_referrals?select=referral_id,patient_first_name,patient_surname,nhis_approval_status,target_department_name,referral_workflow_status,specialty_module&limit=10' -Headers $headers -Method GET
    
    if ($response.Count -eq 0) {
        Write-Host "  No pending internal referrals found" -ForegroundColor Gray
    } else {
        foreach ($ref in $response) {
            Write-Host "  Patient: $($ref.patient_first_name) $($ref.patient_surname)" -ForegroundColor Green
            Write-Host "    Referral ID: $($ref.referral_id)"
            Write-Host "    NHIS Status: $($ref.nhis_approval_status)"
            Write-Host "    Specialty: $($ref.specialty_module)"
            Write-Host "    Target Dept: $($ref.target_department_name)"
            Write-Host "    Workflow: $($ref.referral_workflow_status)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check clinical_requests with specialty referrals
Write-Host "`n2. All Specialty Referral Clinical Requests:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1/clinical_requests?select=id,request_number,request_type,specialty_module,nhis_approval_status,referral_workflow_status,status&request_type=eq.Referral&order=created_at.desc&limit=10" -Headers $headers -Method GET
    
    if ($response.Count -eq 0) {
        Write-Host "  No specialty referrals found" -ForegroundColor Gray
    } else {
        foreach ($cr in $response) {
            Write-Host "  Request: $($cr.request_number)" -ForegroundColor Cyan
            Write-Host "    ID: $($cr.id)"
            Write-Host "    Specialty: $($cr.specialty_module)"
            Write-Host "    NHIS: $($cr.nhis_approval_status)"
            Write-Host "    Workflow: $($cr.referral_workflow_status)"
            Write-Host "    Status: $($cr.status)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check NHIS referral queue for internal approvals
Write-Host "`n3. NHIS Referral Queue (Internal Approval Requests):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://wseumhbzroyznxeuipwa.supabase.co/rest/v1/nhis_referral_queue?select=id,request_type,status,clinical_request_id,target_clinic_id&request_type=eq.internal_nhis_approval&order=created_at.desc&limit=10" -Headers $headers -Method GET
    
    if ($response.Count -eq 0) {
        Write-Host "  No internal NHIS approval requests in queue" -ForegroundColor Gray
    } else {
        foreach ($q in $response) {
            Write-Host "  Queue ID: $($q.id)" -ForegroundColor Magenta
            Write-Host "    Request Type: $($q.request_type)"
            Write-Host "    Status: $($q.status)"
            Write-Host "    Clinical Request: $($q.clinical_request_id)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CHECK COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
