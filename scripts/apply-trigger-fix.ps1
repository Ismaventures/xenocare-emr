# Apply fix for referral trigger UUID issue
$h = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

Write-Host "Please apply the fix migration: migrations/113_fix_referral_trigger_uuid.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host "https://supabase.com/dashboard/project/wseumhbzroyznxeuipwa/sql/new"
Write-Host ""
Write-Host "Copy the contents of migrations/113_fix_referral_trigger_uuid.sql and run it."
