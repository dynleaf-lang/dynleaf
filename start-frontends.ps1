# PowerShell script to start both frontends with correct ports
# Customer Frontend: http://localhost:5173
# Kitchen Frontend: http://localhost:5176

Write-Host "Starting Food Menu Order Management Frontends..." -ForegroundColor Green
Write-Host "Customer Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Kitchen Frontend will be available at: http://localhost:5176" -ForegroundColor Yellow

# Start Customer Frontend on port 5173
Write-Host "`nStarting Customer Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend\customer'; npm start"

# Wait a moment for the first process to start
Start-Sleep -Seconds 3

# Start Kitchen Frontend on port 5176
Write-Host "Starting Kitchen Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend\Kitchen'; npm start"

Write-Host "`nBoth frontends are starting..." -ForegroundColor Green
Write-Host "Customer Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Kitchen Frontend: http://localhost:5176" -ForegroundColor Yellow
Write-Host "`nPress any key to exit this script..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
