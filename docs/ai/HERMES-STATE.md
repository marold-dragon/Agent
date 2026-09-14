# HERMES-STATE — Forensic Audit State

Concise, resumable state. Do not dump transcripts here.

## Phase

AUDIT → REMEDIATE → VERIFY → RE-AUDIT — **stable**. All executable findings resolved or disproven.

## Scope

Workspace root: `D:\New Project` (git repo, remote `origin` = github.com/marold-dragon/Agent.git).
Audited product code: `internal/tool/` (Node ESM, no build step, no lint/typecheck config).
Runtime: Node v24.19.0 on win32.

## Canonical findings

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| H-001 | Static file path containment | LOW (defense-in-depth) | VERIFIED_FIXED | Not exploitable (URL parser normalizes dot-segments); boundary now enforced explicitly in `resolveInsideRoot()` + 27 regression assertions |
| H-002 | Generated report HTML trust boundary | — | NOT_REPRODUCIBLE | Markers escaped (`escapeHTML` in both generators); invalid `status` enum-rejected before HTML (exit 1) |
| H-003 | Orphaned test files never wired into `npm test` | MEDIUM | VERIFIED_FIXED | 5 files / 400+ assertions in `tests/` never ran; canonical runner now executes them |
| H-004 | Dead npm dependency `readline@1.3.0` | LOW | BLOCKED (approval) | Code uses builtin `node:readline`; npm removal needs interactive approval — owner-only |
| H-005 | Server emits no per-request access log | LOW | OPEN | Observability only, no security impact; not changed to avoid scope creep |

## Active TODO

- None executable. H-004 awaiting owner approval to run `npm uninstall readline`.

## Blockers

- `npm uninstall readline` and other npm-mutating commands are gated behind interactive approval; not retried.

## Active concurrent writer (important)

A second agent — the **OpenAI Codex desktop app** (node PIDs ~11232, `server.js` on port 3789) — is running
against this same repository. During this session it auto-committed this session's `internal/tool` changes
as `b501c2b` (author "Codex") and is producing its own AO audit/remediation commits (`121756c`, `3b4b676`,
`9f0e5fd`). It also runs an AO orchestrator with active worktrees under `C:\Users\Lenovo\.ao\data\worktrees`.
Two writers on one worktree is a collision risk — coordinate before further edits.

## Next executable action

None required for correctness/security. Optionally: owner approves `npm uninstall readline`, and `npm run test:browser` may be run where Playwright browsers are installed.

## Verification (current)

- `node run-all-tests.mjs` → exit 0, all stages pass (499 assertions / 7 files).
- `node run-unit-tests.mjs` → 6/6 files pass; fail-propagation proven (exit 1 on injected failure).
- Raw-HTTP request matrix: 8/8 gates correct.
- `npm audit --omit=dev` → 0 vulnerabilities.