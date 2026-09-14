# HERMES-STATE — Forensic Audit State

Concise, resumable state. Do not dump transcripts here.

## Phase

AUDIT → REMEDIATE → VERIFY → RE-AUDIT → **STABILIZE (concurrency + inventory + skill)** — stable.
Hermes execution mode: **READ / AUDIT / COORDINATE ONLY** on the shared worktree (see H-006).

## Current Git reality

- CURRENT HEAD: `ec59195` (`docs(audit): record Hermes forensic audit state, evidence, and state-file tracking`)
- CURRENT BRANCH: `checkpoint/internal-tool-ao`
- HERMES WORKTREE: `D:/New Project` (shared — see H-006)
- Repo-local git identity is `Codex <codex@openai.com>`, so **all** commits in this repo show author
  "Codex" regardless of which agent made them. Attribute by content, not by author.
- OTHER ACTIVE WORKTREES: 11 under `C:/Users/Lenovo/.ao/data/worktrees/new-project/*` plus
  `D:/New Project/work/ao-reconcile`.

## Canonical findings

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| H-001 | Static file path containment | LOW (defense-in-depth) | VERIFIED_FIXED | Not exploitable (URL parser normalizes dot-segments); boundary enforced by `resolveInsideRoot()` + 27 regression assertions |
| H-002 | Generated report HTML trust boundary | — | NOT_REPRODUCIBLE | Markers escaped in both generators; invalid `status` enum-rejected before HTML (exit 1) |
| H-003 | Orphaned test files never wired into `npm test` | MEDIUM | VERIFIED_FIXED | 5 files / 400+ assertions never ran; canonical runner now executes them |
| H-004 | Dead npm dependency `readline@1.3.0` | LOW | **VERIFIED_FIXED** | Owner approved; `npm uninstall readline` ran → `dependencies` removed, lockfile entry gone, `npm audit` 0 vulnerabilities. |
| H-005 | Server emits no per-request access log | LOW | OPEN | Observability only, no security impact; not changed (freeze) |
| H-006 | Concurrent repository writers on one worktree | HIGH (orchestration/integrity) | CONFIRMED / MITIGATED-BY-FREEZE | Hermes and the Codex/AO agent both wrote `D:/New Project`; Codex committed Hermes-produced code as `b501c2b`. Hermes is now read/audit-only on this worktree. |
| H-007 | H-001 testability: containment predicate duplicated in test | LOW | DEFERRED | `resolveInsideRoot()` is private in `server.js`; the regression test mirrors the predicate. Extracting a shared module is a product-code edit — deferred under the H-006 freeze. Real-HTTP integration coverage is authoritative. |
| H-008 | Self-wakeup / AO orchestration behaviour | INFO | INVESTIGATED | "Waking up default…" is a normal Hermes desktop session boot, not a scheduled audit. Hermes cron = 0 jobs, hooks dir empty, AO tasks carry no schedule trigger. Cannot spawn duplicate audits. The genuinely autonomous writer is a **separate product** (Agent Orchestrator v0.13.0). See evidence. |
| H-009 | Legacy unbounded self-continuation runners | LOW | OPEN (dormant) | `run-internal-tool-autonomous.ps1` / `-opencode.ps1` / `run-ui-autonomous-failover.ps1` loop forever on `exit 0 && gate unsatisfied`. No `.ps1` runner is currently active; files are gitignored as superseded. Risk only if manually run. |

## Active TODO

- H-007 (extract the containment helper into a shared module) — optional hardening; real-HTTP coverage is authoritative.
- H-005 (per-request access log) — optional observability only.
- H-009 (legacy unbounded runners) — keep gitignored/dormant; do not run.
- No blocking work remains.

## Blockers (classified)

- **BLOCKED_TOOL_PERMISSION** — none remaining. H-004 cleared: the owner approved and `npm uninstall readline` ran successfully.
- **BLOCKED_ENVIRONMENT** — none: Playwright chromium is installed and `npm run test:browser` passes.
- **BLOCKED_EXTERNAL_ACCESS / CREDENTIAL / OWNER_DECISION** — none.

## Concurrent writer — Agent Orchestrator ("AO")

The autonomous writer on this repo is the **AO desktop app v0.13.0**
(`C:\Program Files\agent-orchestrator\agent-orchestrator.exe`), daemon `ao.exe` PID 29224 on port 3001,
started 2026-09-14T06:06:19Z, with 11 chat-hosts and 9 active worktrees under
`C:\Users\Lenovo\.ao\data\worktrees\new-project\*`. It drives `opencode.exe` agents, committed this
session's `internal/tool` changes as `b501c2b` (author "Codex"), and appended its own sections into
`HERMES-EVIDENCE.md` mid-session. Its registry is `docs/ai/AO-TASK-REGISTRY.json` (AO-001…AO-009);
**AO-001 is bound to `checkpoint/internal-tool-ao`** — the same branch as this worktree.

**Owner decision recorded:** continue in the shared worktree and accept the collision risk (no isolated
Hermes worktree). Two writers on one worktree remains a collision hazard.

## Self-wakeup behaviour (H-008)

"Waking up default…" is a **normal Hermes desktop session boot**, not a scheduled audit:

- `desktop.log` shows a full Hermes backend boot at 06:55:02Z–06:55:10Z: "Resolving Hermes backend" →
  "Hermes runtime is ready" → "Hermes backend is ready. Finalizing desktop startup".
- No `waking` string appears in any Hermes log — the label is a UI transient during session start.
- **Hermes cron = 0 jobs** (ticker alive, idle); `hermes/hooks` is empty; AO task records carry **no**
  schedule/cron/auto/trigger field.

Conclusion: a wakeup here **resumes the default profile session and cannot spawn a duplicate audit**.
No orchestration fix is required on the Hermes side.

## Next safe action

Nothing required for correctness/security. If further product-code edits are needed, prefer a dedicated
Hermes branch + isolated worktree (the AO agent is active on `checkpoint/internal-tool-ao`).

## Verification (latest Hermes HEAD)

- `node run-all-tests.mjs` → exit 0 (module suite + 6 unit files, 499 assertions / 7 files).
- `npm run test:browser` → exit 0 (27 tests / 8 suites; server torn down, no leak).
- `node run-unit-tests.mjs` → fail-propagation proven (exit 1 on injected failure).
- `node scripts/ao/orchestrator.mjs validate` → exit 0 (`AO platform validation passed.`).
- `node scripts/ao/orchestrator.test.mjs` → exit 0 (`AO scheduler failure-mode tests passed.`).
- Raw-HTTP request matrix → 8/8 gates correct.
- `npm audit --omit=dev` → 0 vulnerabilities.