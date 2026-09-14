# OpenAgentic, OpenCode, Hermes, and Agent Orchestrator

## Verified state (14 September 2026)

- `OPENAGENTIC_API_KEY` is present in the Windows User environment. Runtime launchers copy it to Process scope when necessary and never print its value.
- `GET https://openagentic.id/api/v1/models` returned HTTP 200. All eight configured target IDs were advertised.
- Minimal inference passed through OpenCode and through the Hermes CLI with `deepseek-v4.1-flash`.
- Project config `D:\New Project\opencode.json` and user config `C:\Users\Lenovo\.config\opencode\opencode.json` both contain the eight target models.
- The AO daemon was restarted after loading the User-scope OpenAgentic and GitHub credentials. `ao doctor` reported Core, OpenCode, and GitHub authentication as passing.

No credential value is stored in this repository.

## Configuration

| Component | Location or value |
| --- | --- |
| OpenAgentic base URL | `https://openagentic.id/api/v1` |
| Credential variable | `OPENAGENTIC_API_KEY` |
| Project OpenCode config | `D:\New Project\opencode.json` |
| User OpenCode config | `C:\Users\Lenovo\.config\opencode\opencode.json` |
| Verification script | `D:\New Project\internal\tool\setup-openagentic.ps1` |
| Failover runner | `D:\New Project\run-ui-autonomous-failover.ps1` |
| Hermes config | `C:\Users\Lenovo\AppData\Local\Hermes\config.yaml` |
| Hermes state | `C:\Users\Lenovo\AppData\Local\Hermes\state.db` |

The scripts treat User and Process environment scope separately. A variable can exist at User scope while an already-running desktop process still has no Process-scope copy.

## OpenAgentic target audit

The `/models` response advertised these eight configured targets:

1. `claude-sonnet-4.6`
2. `deepseek-v4-flash`
3. `deepseek-v4.1-flash`
4. `deepseek-v4.1-flash-free`
5. `gemini-3.8-flash-high`
6. `qwen3.8-flash-free`
7. `glm-5.3-flash`
8. `muse-spark-1.3-free`

Advertisement is not a health result. A concurrent minimal-inference probe produced this point-in-time evidence:

| Model | Result |
| --- | --- |
| `deepseek-v4-flash` | HTTP 200 |
| `deepseek-v4.1-flash` | HTTP 200 |
| `gemini-3.8-flash-high` | HTTP 200 |
| `qwen3.8-flash-free` | HTTP 200 |
| `glm-5.3-flash` | HTTP 200 |
| `deepseek-v4.1-flash-free` | HTTP 429 |
| `muse-spark-1.3-free` | HTTP 503 |
| `claude-sonnet-4.6` | timed out during this probe |

Availability changes over time. The repository failover runner probes inference before admitting a candidate to its live rotation.

## Hermes repair

The Hermes session shown in the desktop UI stored `gemini-3.1-pro`, while earlier attempts also selected `glm-5.3`. OpenAgentic returned HTTP 403 because those model routes were not included in the active plan.

The local repair performed the following actions while Hermes was stopped:

- backed up `state.db` using SQLite's backup API;
- changed the active `halo` session and its `model_config` to `deepseek-v4.1-flash` with provider `custom:openagentic.id`;
- set Hermes' global and custom-provider default to `deepseek-v4.1-flash`;
- restricted the Hermes OpenAgentic model picker to the five models that returned HTTP 200 in the current probe;
- configured fallback order: `deepseek-v4-flash`, `gemini-3.8-flash-high`, `qwen3.8-flash-free`, then `glm-5.3-flash`;
- removed two terminal snapshots and four request dumps that had copied credential-bearing process environment data;
- restarted the Hermes desktop application.

`hermes doctor` accepted config version 44 with no deprecated keys or active security advisories. A one-shot Hermes inference returned the exact marker `HERMES_OPENAGENTIC_READY`.

Hermes' fallback command states that automatic fallback covers rate limiting, 5xx responses, and connection failures. Plan-level HTTP 403 routes were removed from the picker instead of being retained as fallback candidates.

## AO handoff and task lifecycle

AO-launched workers inherit environment variables from the AO desktop process. The desktop app and daemon were restarted with User-scope `OPENAGENTIC_API_KEY` and `AO_GITHUB_TOKEN` loaded into Process scope.

After restart:

- daemon health was `ready` on port 3001;
- Core checks passed;
- OpenCode `v2.0.3` passed;
- GitHub authentication passed for the configured account;
- Lead, Recovery, Implementation, and Verification sessions resumed with distinct task IDs and generation-2 leases;
- completed work was integrated into PR #1, while merge remained untouched.

The registry now marks AO-007, AO-008, and AO-009 `READY_TO_MERGE` with real commit, PR, and validation evidence. Completed workers are not replaced with probe or duplicate sessions.

## Verification commands

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\New Project\internal\tool\setup-openagentic.ps1"
node scripts/ao/orchestrator.mjs validate
```

The failover and setup scripts both parse with zero errors on Windows PowerShell 5.1. The failover script contains no non-ASCII bytes and no UTF-8 BOM.

## Regression evidence

- Direct `/models`: HTTP 200; eight of eight target IDs advertised.
- OpenCode minimal inference: pass with `openagentic/deepseek-v4.1-flash`.
- Hermes minimal inference: pass with `deepseek-v4.1-flash`.
- AO health: daemon ready; Core, OpenCode, and GitHub auth passed.
- AO scheduler and registry validation: pass.
- `internal\tool` full test runner: all stages passed, including six of six unit files.
- Browser suite: 27 passed, 0 failed.
- Localhost root probe: HTTP 200.

These are point-in-time results. Runtime probes remain the source of truth for provider health.
