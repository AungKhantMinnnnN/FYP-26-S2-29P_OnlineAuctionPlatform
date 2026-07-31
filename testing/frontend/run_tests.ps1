#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Local entry point: installs dependencies (if needed) and runs the frontend
    unit/component test suite (Vitest + React Testing Library). Everything
    runs in jsdom against mocked HTTP clients -- no live backend, no real
    network calls, and no test data is ever written anywhere (see TESTING.md).

.EXAMPLE
    .\run_tests.ps1
    Runs every test file.

.EXAMPLE
    .\run_tests.ps1 src/api/authApi.test.ts
    Runs just one file.
#>
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$frontendDir = Join-Path $here "..\..\frontend"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm not found -- install Node.js 20+ first."
    exit 1
}

Set-Location $frontendDir

Write-Host "Using $(node --version) / $(npm --version)"
Write-Host "Installing dependencies..."
npm ci --quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running frontend test suite..."
$rawJson = [System.IO.Path]::GetTempFileName()
try {
    npx vitest run --reporter=default --reporter=json --outputFile.json=$rawJson @args
    $status = $LASTEXITCODE

    node (Join-Path $here "report.mjs") $rawJson
}
finally {
    Remove-Item -Path $rawJson -Force -ErrorAction SilentlyContinue
}

exit $status
