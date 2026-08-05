param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting PostgreSQL (orders + products)..."
Set-Location $root
docker compose up postgres products-postgres -d

if ($Build) {
    Write-Host "Building and starting full stack..."
    docker compose up --build -d
    Write-Host "App: http://localhost:8080"
    Write-Host "Products API: http://localhost:5281"
} else {
    Write-Host ""
    Write-Host "PostgreSQL is running (orders :5433, products :5434)."
    Write-Host "Start API:       cd src/backend; dotnet run --project OrderTracking.Api"
    Write-Host "Start Products:  cd src/products; dotnet run --project Products.Api"
    Write-Host "Start UI:        cd src/frontend; npm run dev"
    Write-Host "Start Catalog:   cd src/catalog; npm run dev"
    Write-Host ""
    Write-Host "API:          http://localhost:5280/health"
    Write-Host "Products API: http://localhost:5281/health"
    Write-Host "UI:           http://localhost:5173"
    Write-Host "Catalog:      http://localhost:3001"
}
