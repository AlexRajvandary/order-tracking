param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting PostgreSQL..."
Set-Location $root
docker compose up postgres -d

if ($Build) {
    Write-Host "Building and starting full stack..."
    docker compose up --build -d
    Write-Host "App: http://localhost:8080"
} else {
    Write-Host ""
    Write-Host "PostgreSQL is running."
    Write-Host "Start API:  cd src/backend; dotnet run --project OrderTracking.Api"
    Write-Host "Start UI:   cd src/frontend; npm run dev"
    Write-Host ""
    Write-Host "API: http://localhost:5280/health"
    Write-Host "UI:  http://localhost:5173"
}
