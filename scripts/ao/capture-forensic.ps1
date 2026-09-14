#Requires -Version 5.1
param(
    [string]$Repo = "D:\New Project",
    [string]$Project = "new-project",
    [string]$Ao = "C:\Program Files\agent-orchestrator\resources\daemon\ao.exe"
)
$ErrorActionPreference = "Stop"
$raw = & $Ao session ls -p $Project -a --include-terminated --json | Out-String
$sessions = (ConvertFrom-Json $raw).data
$valuable = @("new-project-23", "new-project-25", "new-project-29", "new-project-30", "new-project-35", "new-project-46")
$completed = @("new-project-20", "new-project-21", "new-project-22", "new-project-24", "new-project-48")
$rows = foreach ($session in $sessions) {
    $worktree = if ($session.role -eq "orchestrator") {
        "C:\Users\Lenovo\.ao\data\worktrees\$Project\orchestrator\$Project-orchestrator"
    } else {
        "C:\Users\Lenovo\.ao\data\worktrees\$Project\$($session.id)"
    }
    $exists = Test-Path -LiteralPath $worktree
    $gitStatus = $null
    $head = $null
    if ($exists) {
        $gitStatus = ((& git -C $worktree status --porcelain) | Out-String).Trim()
        $head = ((& git -C $worktree rev-parse HEAD) | Out-String).Trim()
    }
    $classification = if ($session.id -eq "new-project-25") { "UNIQUE_WORK_TO_SALVAGE" }
        elseif ($valuable -contains $session.id) { "TERMINATED_WITH_VALUE" }
        elseif ($completed -contains $session.id) { "COMPLETED_ALREADY" }
        elseif ($session.role -eq "orchestrator") { "STALE_NO_VALUE" }
        elseif ($session.isTerminated) { "DUPLICATE" }
        else { "UNKNOWN_NEEDS_INSPECTION" }
    $disposition = switch ($classification) {
        "UNIQUE_WORK_TO_SALVAGE" { "Preserve branch and classify commit 17a74309 under AO-004." }
        "TERMINATED_WITH_VALUE" { "Preserve branch/worktree evidence; migrate finding to canonical registry task." }
        "COMPLETED_ALREADY" { "Keep historical evidence; useful patch is represented in checkpoint." }
        "STALE_NO_VALUE" { "Replace from canonical base after configuration migration; do not reuse stale session." }
        "DUPLICATE" { "Keep terminated until preservation audit is complete; do not respawn." }
        default { "Inspect before any cleanup." }
    }
    [pscustomobject]@{
        session_id = $session.id
        logical_objective = $session.displayName
        current_card_state = $session.status
        agent_role = $session.role
        model_provider = "unknown-not-recorded-by-session-list"
        branch = $session.branch
        worktree = if ($exists) { $worktree } else { $null }
        git_status = $gitStatus
        head_commit = $head
        prs = @($session.prs)
        last_runtime_activity = $session.lastActivityAt
        classification = $classification
        recommended_disposition = $disposition
    }
}
$snapshot = [ordered]@{
    schema_version = 1
    captured_at = (Get-Date).ToString("o")
    project = $Project
    repository = $Repo
    canonical_head = ((& git -C $Repo rev-parse HEAD) | Out-String).Trim()
    local_database_snapshot = "C:/Users/Lenovo/.ao/data/snapshots/20260914-100457/ao.db"
    secrets_included = $false
    counts = [ordered]@{
        sessions = @($rows).Count
        active = @($sessions | Where-Object { -not $_.isTerminated }).Count
        terminated = @($sessions | Where-Object { $_.isTerminated }).Count
        prs = @($sessions | ForEach-Object { $_.prs }).Count
    }
    sessions = @($rows)
}
$output = Join-Path $Repo "docs\ai\AO-FORENSIC-SNAPSHOT.json"
$snapshot | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $output -Encoding UTF8
Write-Host "Forensic snapshot written without conversation text or secrets: $output"
