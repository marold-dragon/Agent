# AO Runtime Startup and Provider Handoff

Repeatable verification path for the Windows Agent Orchestrator (AO) + OpenAgentic +
OpenCode startup handoff. Every command below was executed on 14 September 2026 and the
observed result is recorded next to it.

This document contains **no credential values**. Secret material is only ever referenced by
environment-variable name, and scripts report presence as booleans.

## Scope

| Item | Path |
| --- | --- |
| Verification script | `internal/tool/setup-openagentic.ps1` |
| Failover runner | `run-ui-autonomous-failover.ps1` |
| Project config (read-only) | `opencode.json` |
| User config (read-only) | `%USERPROFILE%\.config\opencode\opencode.json` |
| OpenAgentic base URL | `https://openagentic.id/api/v1` |

## Credential handoff model

The credential lives in the **Windows User** environment scope as `OPENAGENTIC_API_KEY`.
AO-launched processes do not always inherit it, so the handoff is User scope → Process scope,
performed defensively inside each script.

Observed precondition on this host:

```text
Process scope present: False
User scope present:    True
```

Both scripts apply the same rule: if the Process-scope variable is empty, copy the User-scope
value into the Process scope; fail loudly if neither scope has a value. Neither script creates,
rotates, persists, or prints the value.

If the User variable is added or changed while the AO desktop app is already running, close and
reopen AO once so newly spawned agents inherit it. The scripts remain defensive and load the User
value themselves, so a restart is convenient rather than mandatory.

## Verification steps

### 1. PowerShell 5.1 parser check

Parsing must report zero errors before either script is used. This is the gate that the
`#Requires -Version 5.1` contract depends on.

```powershell
$files = @("run-ui-autonomous-failover.ps1", "internal/tool/setup-openagentic.ps1")
foreach ($f in $files) {
    $errs = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path $f).Path, [ref]$null, [ref]$errs)
    "{0}: {1} parse error(s)" -f $f, $errs.Count
}
```

Observed: `0` errors for both files on PowerShell `5.1.26100.9444`.

### 2. OpenAgentic environment and inference

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "internal\tool\setup-openagentic.ps1"
```

The script loads the credential, checks `GET /api/v1/models`, audits both OpenCode configs,
and runs one minimal inference. Use `-SkipInference` for a fast API-and-config-only pass.

Observed (full run, exit code `0`):

```text
Process environment present: False
User environment present:    True
Loaded the User value into this process.
Direct API OK: HTTP 200; all target models advertised.
Config OK (8 models): D:\New Project\opencode.json
Config OK (8 models): C:\Users\Lenovo\.config\opencode\opencode.json
Minimal inference OK: openagentic/deepseek-v4.1-flash
OpenAgentic verification passed. Secret value was not printed.
```

### 3. AO doctor

```powershell
& "C:\Program Files\agent-orchestrator\resources\daemon\ao.exe" doctor
```

Observed: Core checks all `PASS` (config, data-dir, data-dir-write, sqlite, hooks-log, daemon
ready on port 3001) and the OpenCode harness `PASS` (`opencode v2.0.3`). Missing optional
harnesses (`claude`, `grok`, `qwen`, ...) report `WARN` and are not handoff blockers.

### 4. Failover rotation resolvability

The runner only admits a model to the rotation after a successful minimal inference probe, but
each candidate must first appear in `opencode models`.

```powershell
$oc = Join-Path ((& "C:\Program Files\nodejs\npm.cmd" config get prefix).Trim()) "opencode.cmd"
$live = (& $oc models | Out-String)
# Compare against the $fallbackModels array in run-ui-autonomous-failover.ps1
```

Observed: all eight configured rotation entries resolve in the live list, including
`opencode/mimo-v2.5-free` (provider prefix is `opencode`, distinct from the `momooo/` provider).
The CLI flags the scripts rely on — `--standalone`, `--auto`, `--model`, `--format` — are all
valid for `opencode v2.0.3`.

## Defects found and fixed

| Defect | Reproduction | Fix |
| --- | --- | --- |
| `run-ui-autonomous-failover.ps1` carried a UTF-8 BOM (bytes `EF BB BF`), contradicting the documented ASCII-only contract in `docs/ai/OPENAGENTIC-CONFIG.md`. A naive ASCII-only consumer decoded the leading bytes as `���`. | `[System.IO.File]::ReadAllBytes()` showed 3 non-ASCII bytes at offsets 0-2. | Stripped the BOM so the file is byte-for-byte ASCII. CRLF line endings and all 250 line breaks preserved; size 9179 -> 9176 bytes; parser still reports 0 errors. |

No other reproducible defect was found. Both scripts already use only valid OpenCode v2.0.3
flags, and the full eight-model failover rotation resolves against the live provider list.

## Secret-handling rules

- Never print, log, echo, commit, or persist the value of `OPENAGENTIC_API_KEY`.
- Report credential state only as a boolean presence check per scope.
- `setup-openagentic.ps1` and `run-ui-autonomous-failover.ps1` do not create, rotate, or store
  credentials; they only copy User scope into Process scope in memory.
- Do not add credential values to this document, the task registry, or any AO state file.

## Expected runtime acceptance

A healthy handoff satisfies all of the following:

1. Parser check reports `0` errors for both scripts on PowerShell 5.1.
2. `setup-openagentic.ps1` exits `0` and prints the "Secret value was not printed" line.
3. `ao doctor` reports the Core block all `PASS` and `opencode` `PASS`.
4. Every configured rotation model resolves in `opencode models`.
