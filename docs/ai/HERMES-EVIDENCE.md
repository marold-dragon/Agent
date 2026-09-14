# HERMES-EVIDENCE — Reproduced Facts and Commands

Evidence-first record. Each entry: finding ID, source, reproduction, commands, result.

---

## H-001 — Static file path containment

**Source:** `internal/tool/server.js` static-file routing (`path.join(ROOT, pathname)`).

**Phase A/B — parser + path semantics (executed):**
- `node path-semantics.mjs` (probe, temp) proved:
  - `new URL("/../../../../Windows/win.ini", base).pathname` → `/Windows/win.ini` (dot-segments normalized by WHATWG parser).
  - `/data/%2e%2e/%2e%2e/Windows/win.ini` → `/Windows/win.ini` (percent-decoded dot-segments also normalized).
  - `/..\..\Windows\win.ini` → `/Windows/win.ini` (backslash treated as separator for `http:`).
  - Encoded separators `%2f`/`%5c` remain literal → cannot form a path separator.
- **DECODING PASSES = 1** (single `new URL(req.url, base)` at `server.js:212`; no `decodeURI`/`decodeURIComponent`/`unescape` anywhere — grep confirmed).

**Phase A — raw-socket probes (executed, 24 payloads + 14 corrected):**
- 24 adversarial targets via raw TCP (preserving exact request target): **0 leaks, all 404**.
- Corrected containment predicate (`rel === ".." || rel.startsWith(".."+sep) || isAbsolute(rel)`, NOT `startsWith("..")`):
  - `TOTAL TESTED = 14`, `REAL ESCAPES = 0`, `SENTINEL/OS-FILE LEAKS = 0`.
  - The single prior "escape" flag (`/C:/Windows/win.ini`) was a predicate false positive: it resolves to `ROOT\C:\Windows\win.ini` (a literal filename, still inside ROOT), HTTP 404.

**Phase C — verdict:** `NOT_REPRODUCIBLE` as an exploitable traversal under the current request path (SOURCE present, but no reachable out-of-root impact).

**Phase D — remediation (defense in depth):**
- Added `resolveInsideRoot(root, requestPath)` in `server.js`: resolves against ROOT and rejects any result that is absolute or escapes via `..` (uses `path.relative`, not string prefix — Windows-correct).
- Both static branches (`/data/` and general) now route through it; a `null` result returns 404 without touching the filesystem.
- Boundary no longer depends on upstream URL-parser behaviour.

**Phase E — regression:** `internal/tool/tests/path-containment.test.mjs` (NEW): 27 assertions — valid/nested files, `../`, `..\`, encoded traversal, mixed separators, drive-like input, prefix-lookalike, normal 404. Exercises the real server over raw HTTP.

**Verification:** `node run-all-tests.mjs` → exit 0; containment test 27/27 pass.

---

## H-002 — Generated report HTML trust boundary

**Source:** `internal/tool/report-generator.js` (`generateHTML`) and `internal/tool/workspace.js` (`generateReportHTML`).

**Interpolation audit:** every untrusted value is either `escapeHTML(...)`-wrapped (notes, project name, collectedAt, deps, title) or an enum/integer (`status`, `${statusClass}` from `status.toLowerCase()`, counts, `item.order`). No interpolation lands in a script/style/URL-attribute context. Contexts used: HTML text + an HTML class name.

**Reproduction (executed):** inert-marker test with `<img src=x onerror=alert(1)>` and `"><script>alert(2)</script>`:
- `raw unescaped marker present in HTML : false`
- `escaped marker present in HTML       : true`
- invalid `status` (marker) → `exit code 1` (`ERROR: Invalid status ... Valid: SUPPORTED, ATTESTED, NOT SUPPORTED, NOT ASSESSED`) — rejected before HTML generation.

**Verdict:** `NOT_REPRODUCIBLE` (all three conditions not met: untrusted source reaches only safe contexts / enum-rejected). Class name sink is a low-severity hardening opportunity only, not XSS.

---

## H-003 — Orphaned test files not wired into `npm test`

**Source:** `internal/tool/package.json` (`"test": "node test-modules.js"`).

**Reproduction (executed):** `tests/` contained 12 entries (11 test/audit files) but `npm test` invoked only `test-modules.js` (72 assertions). Running each orphan manually:

| File | Result |
|------|--------|
| `tests/dns-checker.test.js` | 93 passed, 0 failed |
| `tests/module-a-evidence-collector.js` | 139 passed, 0 failed |
| `tests/report-engine-semantics.test.js` | 111 passed, 0 failed |
| `tests/residual-fix.test.js` | 10 passed, 0 failed |
| `tests/security-server-dns.test.js` | 47 passed, 0 failed |

**400+ assertions never executed by the canonical command.**

**Test-gap classification:** missing wiring / test does not exercise production path. Existing tests also lacked adversarial HTTP-boundary coverage (see H-001).

**Remediation:**
- NEW `run-unit-tests.mjs` — runs all pure-Node tests, fails on any non-zero exit.
- NEW `run-all-tests.mjs` — canonical `npm test`: module suite + unit suite.
- `package.json`: `test` → `run-all-tests.mjs`; added `test:modules`, `test:units`.

**Verification:**
- `node run-all-tests.mjs` → exit 0, `ALL TEST STAGES PASSED` (7 files / 499 assertions).
- Fail-propagation proven: injecting a failing test made the runner exit 1.
- Request matrix (raw HTTP): 8/8 correct (`/`, `/workspace.css`, `/data/sample-statuses.json` → 200; cross-origin POST → 403; no-Origin POST → 403; wrong-port Origin → 403; PUT → 405; invalid domain with valid Origin → 400).

---

## H-006 — Concurrent repository writers (stabilization phase)

**Fact:** `git config user.name` = `Codex`, `user.email` = `codex@openai.com` — the repo's identity, so
ALL commits are authored "Codex"; authorship is not diagnostic.

**Live processes observed:** `ChatGPT.exe` (OpenAI.Codex 26.908.4834.0) + Codex node runtimes; one leaked
product server `node.exe` PID 11232 running `server.js`, bound `127.0.0.1:3789` since 03:11. 13 AO
worktrees under `C:/Users/Lenovo/.ao/data/worktrees/new-project/*` (all dormant from HEAD's perspective).

**Clobber check (all passed):**
- `grep -c resolveInsideRoot internal/tool/server.js` → 3 (helper + 2 call sites) present.
- `package.json` → `"test": "node run-all-tests.mjs"` present.
- `run-all-tests.mjs`, `run-unit-tests.mjs`, `tests/path-containment.test.mjs` present on disk.
- HEAD `ec59195` file list confirmed via `git show --stat`; all 5 SHAs (`b501c2b 121756c 3b4b676 9f0e5fd ec59195`) verified with `git cat-file -t` → `commit`.
- Only files modified in the last 45 min were `.gitignore` and `HERMES-STATE.md` (Hermes's own writes) — no concurrent product-code churn during this phase.

**Verdict:** shared-worktree risk real but not an active event; Hermes confined to read/audit/coordinate.

## Skill audit — `codebase-audit` (Hermes capability system)

**Path:** `C:/Users/Lenovo/AppData/Local/hermes/skills/software-development/codebase-audit/`
— this is a **Hermes** skill (`skill_view` resolves it), NOT an OpenCode/`.agents` skill.

**Discovery/load proof:** `skill_view(name="codebase-audit")` → `success: true`,
`readiness_status: available`, `setup_needed: false`, linked_files = both references resolved.

**Script execution proof:** `node scripts/raw-http-probe.mjs 3789 /workspace.css "/../../../../Windows/win.ini" "/data/%2e%2e/%2e%2e/Windows/win.ini"`
→ `200 /workspace.css`, `404 /../../../../Windows/win.ini`, `404 /data/%2e%2e/%2e%2e/Windows/win.ini`; no-args → usage + `exit 2`.

**Portability:** grep for project paths / usernames / hard-coded ports → only illustrative example
values inside code comments (`3789`, `Windows/win.ini`); all inputs are CLI parameters. Portable. No
project-specific assumptions.

**Overlap:** `security-review` (`.agents`), `multi-agent-dispatch`, `opencode-worker-dispatch`
(`.agents`), `codebase-design` / `improve-codebase-architecture` (project). Decision: **KEEP** —
`codebase-audit` is end-to-end audit/remediation and does not duplicate any of them (they cover
security-only review, dispatch, or design). No new skill created this phase → no duplicates introduced.

## Final verification from current HEAD (executed)

| Command | Exit | Result |
|---|---|---|
| `node run-all-tests.mjs` (= `npm test`) | 0 | module 72/0; unit files 6/6; `ALL TEST STAGES PASSED` |
| `npm run test:browser` (Chromium present) | 0 | 27 passed, 0 failed, 0 skipped |
| `raw-http-probe` request class | — | 200 control, 404 traversal |
| `npm audit --omit=dev` | 0 | 0 vulnerabilities |
| leaked-port scan (`3799/3955/390x–394x`) | — | none (only Codex's :3789 PID 11232 remains) |

## H-004 — Dead npm dependency `readline@1.3.0`

**Source:** `internal/tool/package.json` `dependencies`.
**Fact:** all readline usage imports the builtin `node:readline` (`import { createInterface } from "node:readline"`); the npm `readline` package is unused (`grep` for `from "readline"` / `require("readline")` → nothing). `npm audit --omit=dev` → 0 vulnerabilities.
**Blocker classification (corrected):** **BLOCKED_TOOL_PERMISSION** — *not* owner-only. The `npm uninstall readline` command awaited an interactive tool-approval prompt and timed out; per policy it was not retried or rephrased, and `package-lock.json` was not hand-edited to bypass the gate.
**Resolution (owner-approved):** the owner approved the action and `npm uninstall readline` ran in `internal/tool`:
```
removed 1 package, and audited 3 packages in 1s
found 0 vulnerabilities
```
`package.json` → `dependencies` is now absent (was `{"readline":"^1.3.0"}`); `grep '"node_modules/readline"' package-lock.json` → 0. **VERIFIED_FIXED.**

---

## H-007 — H-001 testability (predicate duplication)

**Observation:** `resolveInsideRoot()` is private inside `server.js` (which runs on import). The regression test mirrors its predicate, so the two can drift.
**Preferred fix (deferred):** extract the helper to a small module the server imports and the test imports directly, keeping the real-HTTP integration coverage intact.
**Reason for deferral:** it is a product-code edit in the shared worktree → deferred under H-006.

---

## Test inventory reconciliation (stabilization phase)

`internal/tool/tests/` — 14 entries (12 source + 2 JSON fixtures), every one classified; none UNKNOWN.

| File | Type | Canonical runner | In `npm test`? | In `test:browser`? | Exit |
|------|------|------------------|----------------|--------------------|------|
| `dns-checker.test.js` | unit/security | `run-unit-tests.mjs` | yes | no | 0 (93 pass) |
| `module-a-evidence-collector.js` | unit/integration | `run-unit-tests.mjs` | yes | no | 0 (139 pass) |
| `report-engine-semantics.test.js` | unit | `run-unit-tests.mjs` | yes | no | 0 (111 pass) |
| `residual-fix.test.js` | unit/integration | `run-unit-tests.mjs` | yes | no | 0 (10 pass) |
| `security-server-dns.test.js` | security | `run-unit-tests.mjs` | yes | no | 0 (47 pass) |
| `path-containment.test.mjs` | security/integration | `run-unit-tests.mjs` | yes | no | 0 (27 pass) |
| `browser-fix-repro.mjs` | diagnostic (pre-fix repro) | manual | no | no | EXCLUDED — binds an old worker session on port 3822 |
| `browser-fix-verify.mjs` | browser | manual | no | no | EXCLUDED — superseded by `test-browser.js` |
| `browser-fix-ui-audit-3822.mjs` | browser (port shim) | manual | no | no | EXCLUDED — unmodified port-shim copy of `ui-audit.mjs` |
| `design-verify.mjs` | browser (ad-hoc) | manual | no | no | EXCLUDED — ad-hoc check script |
| `design-verify2.mjs` | browser (ad-hoc) | manual | no | no | EXCLUDED — ad-hoc check script |
| `ui-audit.mjs` | browser (audit tool) | manual (`BASE=<url>`) | no | no | EXCLUDED — screenshot audit tool, not a gate |
| `browser-fix-results/*.json` | fixtures | — | no | no | Fixture data, not executable |

**Reconciling the earlier figures:** the "9 orphaned" count matched the total number of unreferenced files under `tests/`; the **"5" figure is the correct count of real tests that belonged in `npm test`** (the first five rows). The other four are browser/diagnostic scripts that are intentionally separate. `internal/tool/test-browser.js` IS wired, via `run-browser-tests.mjs` as `npm run test:browser`.

---

## Skill audit — `codebase-audit` (Hermes capability system)

**Path:** `C:/Users/Lenovo/AppData/Local/hermes/skills/software-development/codebase-audit/` — a **Hermes** skill (`skill_view` resolves it), NOT an OpenCode / `.agents` skill.
**Discovery/load proof:** `skill_view(name="codebase-audit")` → `success: true`, `readiness_status: available`, `setup_needed: false`, `linked_files` resolved (both references + the script).
**Script execution proof:** `node scripts/raw-http-probe.mjs 3799 /workspace.css /../../../../Windows/win.ini` → `200 /workspace.css`, `404 /../../../../Windows/win.ini`; no-args → usage + `exit 2`.
**Portability:** no hard-coded project path, username, or fixed port in the skill body or script logic; all inputs are CLI parameters (one illustrative comment was generalized).
**Defects found + fixed this phase:**
1. SKILL.md blocker text claimed an approval-gated command is "owner-only" → **corrected** to the `BLOCKED_TOOL_PERMISSION` / `BLOCKED_ENVIRONMENT` / `BLOCKED_CREDENTIAL` / `BLOCKED_EXTERNAL_ACCESS` / `BLOCKED_OWNER_DECISION` taxonomy.
2. **Added** `references/concurrent-writer-ownership.md` (detection + reconciliation procedure used here).
**Overlap review:** distinct from `codebase-inspection` (LOC metrics), `requesting-code-review` (pre-commit review), `dogfood` (black-box QA), `systematic-debugging` (root-cause), `sdlc-review` (Kanban routing), `simplify-code` (cleanup). **KEEP** — no duplicate capability.

---

## H-008 — Self-wakeup / AO orchestration behaviour (stabilization phase)

**Question:** what triggered the UI label "Waking up default…", and can it spawn duplicate audits?

**Evidence (executed):**
| Probe | Result |
|---|---|
| `grep -ri "waking"` across `hermes/logs/*` | **no matches** — the phrase appears in no log |
| `hermes/logs/desktop.log` | full boot at 06:55:02–06:55:10Z: "Resolving Hermes backend" → "Hermes runtime is ready" → "Hermes backend is ready. Finalizing desktop startup" |
| `cronjob_manage list` | `{success: true, count: 0, jobs: []}` — **0 scheduled jobs** |
| `hermes/cron/ticker_heartbeat` | epoch `1789369030` ≈ 06:57:10Z, ~34 s old → ticker **alive and idle** |
| `hermes/cron/executions.db` | 24 KB, only the `executions` table — no job history of note |
| `hermes/hooks/` | **empty** |
| AO task records | fields include `last_runtime_heartbeat`, `last_meaningful_progress`; **no** `schedule`/`cron`/`auto`/`trigger` field |
| running processes | no `.ps1` runner active; writer is `agent-orchestrator.exe` v0.13.0 + `ao.exe` + `opencode.exe` |

**Verdict:** `INVESTIGATED` — the wakeup is a **normal Hermes desktop session boot**. Cron is empty, hooks
are empty, and AO tasks have no time/event trigger, so a wakeup **resumes the existing session/profile and
cannot spawn a duplicate audit**. No Hermes orchestration defect. The genuinely autonomous behavior comes
from a **separate product** (Agent Orchestrator v0.13.0), not from a Hermes scheduler.

---

## H-009 — Legacy unbounded self-continuation runners (dormant)

**Source:** `run-internal-tool-autonomous.ps1`, `run-internal-tool-opencode.ps1`, `run-ui-autonomous-failover.ps1`.

**Evidence:** the loop body on `$result.ExitCode -eq 0` prints "OpenCode cycle ended normally, but
completion gate is NOT satisfied. Starting another autonomous cycle instead of stopping." then
`continue` — an unbounded retry loop whose only exits are the completion gate, an exhausted
`MaxConsecutiveProviderFailures` retry budget, or a detected external-authority boundary.

**Risk:** LOW / latent. No `.ps1` runner is currently running; all three files are listed under
"Superseded local runners" in `.gitignore`, and the current AO path uses the registry/lease model with
bounded worker counts instead. Action: leave dormant; do not run without a completion gate that can
actually terminate.

---

## Non-findings (audited, no defect)

- **Command injection / shell argument injection:** nslookup invoked via `spawnSync("nslookup", [args])` (no shell) in both `server.js` and `dns-checker.js`; domain validated against `^[a-zA-Z0-9][a-zA-Z0-9.-]+$`. `execSync` in `evidence-collector.js` runs a locally-read, user-visible project command, not attacker input.
- **CORS/origin:** mutating endpoints reject foreign/absent Origin (403); ACAO reflected only for exact loopback origin + matching port; no wildcard.
- **XSS in frontend DNS rendering:** network-derived signals rendered via `textContent`/`createElement`; static fallback string is a literal.
- **Path traversal elsewhere:** only two request-derived filesystem reads (static routes), both now contained. `save-review` writes a fixed filename.
- **Dependencies:** `npm audit --omit=dev` → 0 vulnerabilities.
- **No lint/typecheck/build config exists** in the project → those gates are N/A (not skipped silently).