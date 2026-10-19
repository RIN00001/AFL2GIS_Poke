$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDirectory
py -3 -m venv .venv
if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.11 or newer with the Windows Python launcher, then retry.' }
& ./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
Write-Host 'Ready. Run scripts/start-local.ps1. Map data and Three.js are already bundled.'
