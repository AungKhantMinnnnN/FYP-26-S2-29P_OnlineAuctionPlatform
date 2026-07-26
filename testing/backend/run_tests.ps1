#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Local/portable entry point: installs dependencies (if needed) and runs the
    full backend QA suite on whatever machine this is invoked from. Requires a
    real Python 3 interpreter — see run_remote.sh if this machine doesn't have
    one (e.g. a bare Windows box) but you can reach a Linux host that does.

.EXAMPLE
    .\run_tests.ps1
    Runs every test module against config.py's default target.

.EXAMPLE
    .\run_tests.ps1 test_auth.py
    Runs just one module.

.EXAMPLE
    $env:QA_BASE_URL = "http://localhost:8000/v1.0.0"; .\run_tests.ps1
#>
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Get-Python {
    foreach ($candidate in @("python3", "python", "py")) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

$python = Get-Python
if (-not $python) {
    Write-Error "No Python interpreter found (tried python3, python, py). Install Python 3.9+, or run this suite on a host that has it — see run_remote.sh."
    exit 1
}

Write-Host "Using $python"
Write-Host "Installing dependencies..."
& $python -m pip install --quiet -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running backend QA suite..."
& $python run_all.py @args
exit $LASTEXITCODE
