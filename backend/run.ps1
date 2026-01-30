$ErrorActionPreference = "Stop"

$venvPath = Join-Path $PSScriptRoot "venv312"
$pythonExe = Join-Path $venvPath "Scripts" "python.exe"

if (-not (Test-Path $pythonExe)) {
  Write-Host "venv312 not found. Create it with: python -m venv venv312"
  exit 1
}

Set-Location $PSScriptRoot
& $pythonExe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
