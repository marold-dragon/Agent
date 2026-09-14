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
| H-004 | Dead npm dependency `readline@1.3.0` | LOW | **BLOCKED_TOOL_PERMISSION** | Not owner-only: the `npm uninstall` command awaited a tool-approval prompt and timed out. Not retried; lockfile not hand-edited. Owner action: run `npm uninstall readline` in `internal/tool`. |
| H-005 | Server emits no per-request access log | LOW | OPEN | Observability only, no security impact; not changed (freeze) |
| H-006 | Concurrent repository writers on one worktree | HIGH (orchestration/integrity) | CONFIRMED / MITIGATED-BY-FREEZE | Hermes and the Codex/AO agent both wrote `D:/New Project`; Codex committed Hermes-produced code as `b501c2b`. Hermes is now read/audit-only on this worktree. |
| H-007 | H-001 testability: containment predicate duplicated in test | LOW | DEFERRED | `resolveInsideRoot()` is private in `server.js`; the regression test mirrors the predicate. Extracting a shared module is a product-code edit — deferred under the H-006 freeze. Real-HTTP integration coverage is authoritative. |

## Active TODO

- None executable under the freeze. H-004 and H-007 await owner action / a Hermes-isolated worktree.

## Blockers (classified)

- **BLOCKED_TOOL_PERMISSION** — `npm uninstall readline` (H-004). Exact action: run it in `internal/tool`.
- **BLOCKED_ENVIRONMENT** — none: Playwright chromium is installed and `npm run test:browser` passes.

## Next safe action

Nothing required for correctness/security. If further product-code edits are needed, create a dedicated
Hermes branch + isolated worktree first (do not edit `D:/New Project` while the Codex agent is active).

## Verification (current HEAD `ec59195`)

- `node run-all-tests.mjs` → exit 0 (module suite + 6 unit files, 499 assertions / 7 files).
- `npm run test:browser` → exit 0 (27 tests / 8 suites; server torn down, no leak).
- `node run-unit-tests.mjs` → fail-propagation proven (exit 1 on injected failure).
- Raw-HTTP request matrix → 8/8 gates correct.
- `npm audit --omit=dev` → 0 vulnerabilities.