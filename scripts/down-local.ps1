$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Set-Location $root
docker compose down

Write-Host "Local Docker stack stopped."
