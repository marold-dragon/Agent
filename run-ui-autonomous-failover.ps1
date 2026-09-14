param(
    [string]$Repo = "D:\New Project",
    [int]$MaxCycles = 30
)

#Requires -Version 5.1

$ErrorActionPreference = "Stop"

function Section([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Invoke-OpenCodeRun {
    param(
        [string]$OpenCode,
        [string]$Model,
        [string]$Message
    )

    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        $output = & $OpenCode run `
            --standalone `
            --auto `
            --model $Model `
            $Message `
            2>&1

        $code = $LASTEXITCODE
        $text = ($output | Out-String)

        [PSCustomObject]@{
            ExitCode = $code
            Text = $text
        }
    }
    finally {
        $ErrorActionPreference = $oldEA
    }
}

function Test-Transient([string]$Text) {
    return (
        $Text -match '(?i)HTTP\s*(429|500|502|503|504)' -or
        $Text -match '(?i)bad gateway|gateway timeout|ECONNRESET|ETIMEDOUT|connection reset|fetch failed|temporar(?:y|ily) unavailable'
    )
}

function Test-ModelHealth {
    param([string]$OpenCode, [string]$Model)
    $probe = Invoke-OpenCodeRun -OpenCode $OpenCode -Model $Model -Message "Reply exactly MODEL_READY. Do not use tools or read files."
    return ($probe.ExitCode -eq 0 -and $probe.Text -match "MODEL_READY")
}

function Test-CompletionGate([string]$Repo) {
    $tool = Join-Path $Repo "internal\tool"
    $package = Join-Path $tool "package.json"
    $state = Join-Path $Repo "docs\ai\INTERNAL-TOOL-STATE.md"
    $acceptance = Join-Path $Repo "docs\audit\INTERNAL-TOOL-BROWSER-ACCEPTANCE.md"

    if (-not (Test-Path $package)) { return $false }
    if (-not (Test-Path $state)) { return $false }
    if (-not (Test-Path $acceptance)) { return $false }

    try {
        $pkg = Get-Content $package -Raw | ConvertFrom-Json
    }
    catch {
        return $false
    }

    $hasTest = $null -ne $pkg.scripts.test
    $hasBrowser = ($null -ne $pkg.scripts.preview) -or ($null -ne $pkg.scripts.dev) -or ($null -ne $pkg.scripts.start)

    if (-not $hasTest -or -not $hasBrowser) { return $false }

    $stateText = Get-Content $state -Raw -ErrorAction SilentlyContinue
    $acceptanceText = Get-Content $acceptance -Raw -ErrorAction SilentlyContinue

    if ($stateText -notmatch '(?im)^\s*STATUS\s*:\s*COMPLETE\s*$') { return $false }
    if ($stateText -notmatch '(?im)^\s*DOD\s*:\s*PASS\s*$') { return $false }

    if ($acceptanceText -notmatch '(?i)APP URL') { return $false }
    if ($acceptanceText -notmatch '(?i)PLAYWRIGHT') { return $false }
    if ($acceptanceText -notmatch '(?i)CHROME DEVTOOLS') { return $false }

    return $true
}

if (-not (Test-Path $Repo)) {
    throw "Repo not found: $Repo"
}

Set-Location $Repo

$npm = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npm)) { throw "npm.cmd not found." }

$prefix = (& $npm config get prefix).Trim()
$opencode = Join-Path $prefix "opencode.cmd"
if (-not (Test-Path $opencode)) { throw "opencode.cmd not found." }

foreach ($required in @(
    "PRD-internal-tool.md",
    "prompt-gemini-internal-tool.md",
    "DESIGN.md",
    "FULL-AUTONOMOUS-INTERNAL-TOOL-UI-v2.md"
)) {
    if (-not (Test-Path (Join-Path $Repo $required))) {
        throw "Source-of-truth file missing: $required"
    }
}

New-Item -ItemType Directory -Force (Join-Path $Repo "docs\audit") | Out-Null

Section "AUTONOMOUS UI FAILOVER RUNNER"

Write-Host ("OpenCode: " + (& $opencode --version)) -ForegroundColor Green
Write-Host "OpenAgentic + MiMo primary models; Holver as last resort." -ForegroundColor Yellow

# Ensure OPENAGENTIC_API_KEY is available
if (-not $env:OPENAGENTIC_API_KEY) {
    $stored = [System.Environment]::GetEnvironmentVariable("OPENAGENTIC_API_KEY", "User")
    if ($stored) { $env:OPENAGENTIC_API_KEY = $stored }
}
if (-not $env:OPENAGENTIC_API_KEY) {
    throw "OPENAGENTIC_API_KEY is missing from Process and User environments."
}

$modelText = (& $opencode models | Out-String)

$fallbackModels = @(
    "openagentic/claude-sonnet-4.6",
    "openagentic/deepseek-v4.1-flash",
    "openagentic/gemini-3.8-flash-high",
    "opencode/mimo-v2.5-free",
    "openagentic/qwen3.8-flash-free",
    "openagentic/glm-5.3-flash",
    "holver/gemini-3.7-flash",
    "holver/gemini-3.1-pro"
)

$availableModels = @()
foreach ($m in $fallbackModels) {
    if ($modelText -match [regex]::Escape($m)) {
        Write-Host ("PROBING    " + $m) -ForegroundColor Yellow
        if (Test-ModelHealth -OpenCode $opencode -Model $m) {
            $availableModels += $m
            Write-Host ("HEALTHY    " + $m) -ForegroundColor Green
        }
        else {
            Write-Host ("UNHEALTHY  " + $m) -ForegroundColor Red
        }
    }
}

if ($availableModels.Count -eq 0) {
    throw "No fallback models available."
}

$baseMessage = @(
    "Resume and complete the Handoff Evidence Internal Tool in D:\New Project.",
    "Read these LOCAL files yourself with file tools before editing: PRD-internal-tool.md, prompt-gemini-internal-tool.md, DESIGN.md, FULL-AUTONOMOUS-INTERNAL-TOOL-UI-v2.md, docs/ai/INTERNAL-TOOL-STATE.md, docs/ai/INTERNAL-TOOL-EVIDENCE.md.",
    "Independent owner verification proved the browser application is not complete.",
    "Treat previous COMPLETE/PASS markers as untrusted until reproduced.",
    "If browser workspace is missing, immediately set STATUS: IN_PROGRESS and DOD: NOT_YET.",
    "Build the real local browser application required by DESIGN.md.",
    "Root localhost must open the workspace, not only acme-bookings.html.",
    "Fix package scripts so npm.cmd test and a real local preview/dev command work.",
    "Start a persistent localhost-only server, verify root URL returns HTTP 200, and open it in the owner browser.",
    "Use Playwright and Chrome DevTools for actual browser verification.",
    "Do not deploy or publish.",
    "Continue autonomously through audit, implementation, browser verification, bug fixing, and regression until the completion gate is truly satisfied.",
    "At the end update docs/ai/INTERNAL-TOOL-STATE.md and docs/audit/INTERNAL-TOOL-BROWSER-ACCEPTANCE.md and print BROWSER READY with actual APP URL, REPORT URL, SERVER PID, START COMMAND, TEST COMMAND, and actual TEST RESULT."
) -join " "

$cycle = 0
$modelIndex = 0
$transientStreak = 0

while ($cycle -lt $MaxCycles) {
    $cycle++

    if (Test-CompletionGate -Repo $Repo) {
        Section "EXTERNAL COMPLETION GATE PASSED"
        Write-Host "Browser app/test/acceptance markers are present." -ForegroundColor Green
        exit 0
    }

    $model = $availableModels[$modelIndex % $availableModels.Count]

    Section ("CYCLE " + $cycle + " - " + $model)

    $message = if ($cycle -eq 1) {
        $baseMessage
    }
    else {
        @(
            "Resume the same internal-tool browser application task from CURRENT REPOSITORY STATE.",
            "Read PRD-internal-tool.md, DESIGN.md, FULL-AUTONOMOUS-INTERNAL-TOOL-UI-v2.md, docs/ai/INTERNAL-TOOL-STATE.md, docs/ai/INTERNAL-TOOL-EVIDENCE.md, and docs/audit/INTERNAL-TOOL-BROWSER-ACCEPTANCE.md if present.",
            "Do not restart finished work.",
            "Find the next incomplete completion-gate item and execute it.",
            "Continue implementation/testing/browser verification until genuinely complete.",
            "Do not deploy or publish."
        ) -join " "
    }

    $result = Invoke-OpenCodeRun -OpenCode $opencode -Model $model -Message $message
    Write-Host $result.Text

    $logName = "ui-failover-cycle-" + $cycle + "-" + ($model -replace '[^a-zA-Z0-9._-]','_') + ".log"
    $log = Join-Path $Repo ("docs\audit\" + $logName)
    $result.Text | Set-Content $log -Encoding UTF8

    if (Test-CompletionGate -Repo $Repo) {
        Section "EXTERNAL COMPLETION GATE PASSED"
        Write-Host ("Final log: " + $log) -ForegroundColor Green
        exit 0
    }

    if ($result.ExitCode -eq 0) {
        $transientStreak = 0
        $modelIndex++
        Write-Host "Run ended but completion gate not satisfied. Rotating model." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        continue
    }

    if (Test-Transient -Text $result.Text) {
        $transientStreak++
        $modelIndex++
        $wait = [Math]::Min(60, 5 * [Math]::Pow(2, [Math]::Min($transientStreak - 1, 3)))

        Write-Host ("Transient provider failure. Switching model after " + $wait + "s.") -ForegroundColor Yellow
        Start-Sleep -Seconds $wait
        continue
    }

    $modelIndex++
    Write-Host "Non-transient failure. Rotating model and resuming." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

throw "MaxCycles reached before completion gate passed. Repo/logs preserved."
