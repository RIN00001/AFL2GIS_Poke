$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'
}
if (-not (Test-Path -LiteralPath $compiler)) {
    throw 'The Windows .NET Framework C# compiler could not be found.'
}
$outputFile = Join-Path $projectDirectory 'FieldDex.exe'
$sourceFile = Join-Path $PSScriptRoot 'FieldDexLauncher.cs'
& $compiler /nologo /target:exe /optimize+ /reference:System.Web.Extensions.dll "/out:$outputFile" $sourceFile
if ($LASTEXITCODE -ne 0) { throw 'FieldDex.exe could not be built.' }
Write-Host "Built $outputFile"
