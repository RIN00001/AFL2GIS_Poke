$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDirectory
$pythonExecutable = Join-Path $projectDirectory '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonExecutable)) {
    throw 'First run scripts/setup.ps1 to install the Python environment.'
}
Write-Host 'Ciputra Field Dex: open http://127.0.0.1:8000 in your browser. Press Ctrl+C to stop.'
& $pythonExecutable -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
