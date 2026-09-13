# OpenAgentic, OpenCode, and Agent Orchestrator

## Verified state (14 September 2026)

- `OPENAGENTIC_API_KEY` exists in the Windows User environment. The original Codex process did not inherit it, so scripts explicitly copy the User value into their Process environment when needed. No secret value is stored in this repository.
- `GET https://openagentic.id/api/v1/models` returned HTTP 200 with the stored credential.
- Minimal OpenCode inference returned the exact expected marker through `openagentic/qwen3.8-flash-free`.
- Both `D:\New Project\opencode.json` and `C:\Users\Lenovo\.config\opencode\opencode.json` contain the OpenAgentic provider and all eight target models.

## Advertised target models

The API advertised all eight IDs during verification:

1. `claude-sonnet-4.6`
2. `deepseek-v4-flash`
3. `deepseek-v4.1-flash`
4. `deepseek-v4.1-flash-free`
5. `gemini-3.8-flash-high`
6. `qwen3.8-flash-free`
7. `glm-5.3-flash`
8. `muse-spark-1.3-free`

Advertisement confirms that an ID exists. The failover runner therefore probes each configured candidate with minimal inference before admitting it to the healthy rotation.

## Configuration and secret handling

- Base URL: `https://openagentic.id/api/v1`
- Credential source: Windows User or Process environment variable `OPENAGENTIC_API_KEY`
- Project config: `D:\New Project\opencode.json`
- User config: `C:\Users\Lenovo\.config\opencode\opencode.json`
- Verification script: `D:\New Project\internal\tool\setup-openagentic.ps1`
- Failover runner: `D:\New Project\run-ui-autonomous-failover.ps1`

The setup script does not create, rotate, persist, or print credentials. It fails when neither environment scope has a value, checks `/models`, audits both configs, and runs one minimal inference by default.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\New Project\internal\tool\setup-openagentic.ps1"
```

Use `-SkipInference` when only API and configuration checks are required.

## Agent Orchestrator handoff

Agent Orchestrator recognizes the installed OpenCode executable. AO-launched processes inherit environment variables from the AO desktop process. If the User variable was added or changed while AO was already running, close and reopen the AO desktop app once so newly spawned agents inherit it. The repository scripts remain defensive and load the User value themselves.

The local AO audit found OpenCode ready. The AO daemon status command reported stopped even though an installed desktop helper process existed; no daemon state was forcibly changed because OpenCode inference works independently and restarting AO would interrupt active sessions.

## Failover behavior

At startup, the runner loads the User credential when its Process environment is empty, lists configured models, and performs a minimal inference probe. Only passing models enter the rotation. A completed run that does not satisfy the repository completion gate advances to the next healthy model; transient and non-transient failures also advance.

The runner is ASCII-only, compatible with Windows PowerShell 5.1, and must parse with zero errors before use.

## Regression evidence

- OpenAgentic direct API: HTTP 200
- OpenAgentic target IDs advertised: 8 of 8
- OpenCode minimal inference: pass
- PowerShell parser: zero errors for setup and failover scripts
- Repository scan for secret-shaped `sk-...` literals: zero matches outside ignored dependencies and Git metadata
- `internal\tool` test suite: 72 passed, 0 failed
- Local browser server: root URL returned HTTP 200 on localhost

These results are point-in-time evidence. Provider availability can change, so the runner probes runtime health rather than treating this document as a live health source.
