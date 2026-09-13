#Requires -Version 5.1
<#
.SYNOPSIS
    Validate the OpenAgentic environment and OpenCode integration.
.DESCRIPTION
    Loads OPENAGENTIC_API_KEY from the current process or current user's
    environment, verifies the models endpoint, audits both OpenCode configs,
    and runs a minimal inference check. The secret is never printed or stored.
#>
param(
    [string]$Repo = "D:\New Project",
    [string]$TestModel = "openagentic/qwen3.8-flash-free",
    [switch]$SkipInference
)

$ErrorActionPreference = "Stop"
$modelIds = @(
    "claude-sonnet-4.6", "deepseek-v4-flash",
    "deepseek-v4.1-flash", "deepseek-v4.1-flash-free",
    "gemini-3.8-flash-high", "qwen3.8-flash-free",
    "glm-5.3-flash", "muse-spark-1.3-free"
)

function Get-OpenAgenticKey {
    $processKey = [Environment]::GetEnvironmentVariable("OPENAGENTIC_API_KEY", "Process")
    $userKey = [Environment]::GetEnvironmentVariable("OPENAGENTIC_API_KEY", "User")
    Write-Host ("Process environment present: " + [bool]$processKey)
    Write-Host ("User environment present:    " + [bool]$userKey)
    if ($processKey) { return $processKey }
    if ($userKey) {
        $env:OPENAGENTIC_API_KEY = $userKey
        Write-Host "Loaded the User value into this process." -ForegroundColor Green
        return $userKey
    }
    throw "OPENAGENTIC_API_KEY is missing from Process and User environments."
}

function Get-OpenAgenticProvider($Config) {
    if ($Config.provider -and $Config.provider.openagentic) { return $Config.provider.openagentic }
    if ($Config.providers -and $Config.providers.openagentic) { return $Config.providers.openagentic }
    return $null
}

function Test-OpenCodeConfig([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { throw "OpenCode config not found: $Path" }
    $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $provider = Get-OpenAgenticProvider $config
    if (-not $provider) { throw "OpenAgentic provider missing from: $Path" }
    $configuredIds = @($provider.models.PSObject.Properties.Name)
    $missing = @($modelIds | Where-Object { $configuredIds -notcontains $_ })
    if ($missing.Count -gt 0) { throw "Models missing from $Path`: $($missing -join ', ')" }
    Write-Host ("Config OK ({0} models): {1}" -f $modelIds.Count, $Path) -ForegroundColor Green
}

$key = Get-OpenAgenticKey
$response = Invoke-WebRequest -UseBasicParsing -Uri "https://openagentic.id/api/v1/models" -Headers @{ Authorization = "Bearer $key" } -TimeoutSec 30
if ([int]$response.StatusCode -ne 200) { throw "OpenAgentic /models returned HTTP $($response.StatusCode)." }
$advertisedIds = @(($response.Content | ConvertFrom-Json).data | ForEach-Object { $_.id })
$notAdvertised = @($modelIds | Where-Object { $advertisedIds -notcontains $_ })
if ($notAdvertised.Count -gt 0) { throw "Models not advertised: $($notAdvertised -join ', ')" }
Write-Host "Direct API OK: HTTP 200; all target models advertised." -ForegroundColor Green

Test-OpenCodeConfig (Join-Path $Repo "opencode.json")
Test-OpenCodeConfig (Join-Path $env:USERPROFILE ".config\opencode\opencode.json")

if (-not $SkipInference) {
    $npm = "C:\Program Files\nodejs\npm.cmd"
    if (-not (Test-Path -LiteralPath $npm)) { throw "npm.cmd not found." }
    $opencode = Join-Path ((& $npm config get prefix).Trim()) "opencode.cmd"
    if (-not (Test-Path -LiteralPath $opencode)) { throw "opencode.cmd not found." }
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $opencode run --standalone --format json --model $TestModel "Reply exactly OPENAGENTIC_AO_READY. Do not use tools or read files." 2>&1
        $exitCode = $LASTEXITCODE
        $text = $output | Out-String
    }
    finally { $ErrorActionPreference = $oldPreference }
    if ($exitCode -ne 0 -or $text -notmatch "OPENAGENTIC_AO_READY") { throw "Minimal inference failed for $TestModel (exit $exitCode)." }
    Write-Host "Minimal inference OK: $TestModel" -ForegroundColor Green
}

Write-Host "OpenAgentic verification passed. Secret value was not printed." -ForegroundColor Green
