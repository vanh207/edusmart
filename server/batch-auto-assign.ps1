# PowerShell script to run batch auto-assign
# Usage: .\batch-auto-assign.ps1

$adminToken = Read-Host "Enter admin token (from browser DevTools > Application > Local Storage > token)"

Write-Host "Running batch auto-assign..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/batch-auto-assign" `
        -Method POST `
        -Headers @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type"  = "application/json"
    }
    
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host "Total students: $($response.total)" -ForegroundColor Cyan
    Write-Host "Assigned: $($response.assigned)" -ForegroundColor Green
    Write-Host "Not found: $($response.notFound)" -ForegroundColor Yellow
    
    if ($response.notFound -gt 0) {
        Write-Host "`nCheck server logs to see which students couldn't be matched." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Server is running (node index.js)" -ForegroundColor Yellow
    Write-Host "  2. Token is valid" -ForegroundColor Yellow
}
