param (
    [string]$Action = "up"
)

$PidsFile = Join-Path $PSScriptRoot ".services.pids"

function Start-ServiceWindow {
    param (
        [string]$Title,
        [string]$Dir,
        [string]$Command
    )
    Write-Host "Starting $Title..." -ForegroundColor Cyan
    # Start cmd.exe in a new window, setting the title, changing directory, and executing the command.
    # We use '/k' so the window remains open if the command exits/crashes, allowing developers to see logs/errors.
    # -PassThru returns the process object so we can capture the PID of the shell.
    $Proc = Start-Process cmd.exe -ArgumentList "/k", "title $Title && cd $Dir && $Command" -PassThru -WindowStyle Normal
    if ($Proc) {
        Add-Content -Path $PidsFile -Value $Proc.Id
    }
}

if ($Action -eq "up") {
    # 1. Start Docker Compose services
    Write-Host "Starting Docker Compose services..." -ForegroundColor Green
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start Docker Compose services."
        exit $LASTEXITCODE
    }

    # Clean up any legacy PIDs file
    if (Test-Path $PidsFile) {
        Remove-Item $PidsFile -Force
    }

    # 2. Start API service (Go)
    Start-ServiceWindow -Title "Rebideo API Service" -Dir "api-service" -Command "go run cmd/api/main.go"

    # 3. Start Transcoder service (Go)
    Start-ServiceWindow -Title "Rebideo Transcoder Service" -Dir "transcoder-service" -Command "go run main.go"

    # 4. Start Frontend service (Next.js)
    $Packager = "npm run dev"
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        $Packager = "pnpm dev"
    } elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
        $Packager = "yarn dev"
    } elseif (Get-Command bun -ErrorAction SilentlyContinue) {
        $Packager = "bun dev"
    }
    Start-ServiceWindow -Title "Rebideo Frontend" -Dir "frontend" -Command $Packager

    Write-Host "`n[SUCCESS] All services have been started in separate terminal windows." -ForegroundColor Green
    Write-Host "To stop them all (including Docker Compose), run: .\run.ps1 down" -ForegroundColor Yellow
}
elseif ($Action -eq "down") {
    Write-Host "Stopping all local services..." -ForegroundColor Yellow

    # 1. Kill all spawned terminal window processes and their children
    if (Test-Path $PidsFile) {
        $Pids = Get-Content $PidsFile
        foreach ($TargetPid in $Pids) {
            if ($TargetPid) {
                $Proc = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
                if ($Proc) {
                    Write-Host "Stopping process tree for PID $TargetPid..." -ForegroundColor Gray
                    # /F forces termination, /T terminates specified process and child processes
                    taskkill /F /T /PID $TargetPid 2>$null | Out-Null
                }
            }
        }
        Remove-Item $PidsFile -Force
    } else {
        Write-Host "No active service PIDs file found. Proceeding to Docker shutdown." -ForegroundColor Gray
    }

    # 2. Stop Docker Compose services
    Write-Host "Stopping Docker Compose services..." -ForegroundColor Green
    docker compose down

    Write-Host "`n[SUCCESS] All services have been stopped." -ForegroundColor Green
}
else {
    Write-Host "Unknown action: $Action. Use 'up' or 'down'." -ForegroundColor Red
}
