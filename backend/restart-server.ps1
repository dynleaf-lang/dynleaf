# Restart backend server script
Write-Host "Restarting Food Menu Order Management Backend Server..." -ForegroundColor Cyan

# Kill any existing node processes running the server (adjust as needed)
Write-Host "Stopping any existing node processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Where-Object { $_.MainWindowTitle -eq "" } | ForEach-Object {
            Write-Host "Stopping node process with PID $($_.Id)..." -ForegroundColor Yellow
            Stop-Process -Id $_.Id -Force
        }
    }
} catch {
    Write-Host "No node processes to stop." -ForegroundColor Gray
}

# Wait a moment
Start-Sleep -Seconds 2

# Start the server
Write-Host "Starting server..." -ForegroundColor Green
npm start
