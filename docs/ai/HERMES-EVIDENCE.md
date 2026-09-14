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

## H-004 — Dead npm dependency `readline@1.3.0`

**Source:** `internal/tool/package.json` `dependencies`.
**Fact:** all readline usage imports the builtin `node:readline`; the npm `readline` package is unused. `npm audit --omit=dev` → 0 vulnerabilities.
**Status:** BLOCKED — `npm uninstall readline` requires interactive approval; not retried. Owner action required.

---

## Non-findings (audited, no defect)

- **Command injection / shell argument injection:** nslookup invoked via `spawnSync("nslookup", [args])` (no shell) in both `server.js` and `dns-checker.js`; domain validated against `^[a-zA-Z0-9][a-zA-Z0-9.-]+$`. `execSync` in `evidence-collector.js` runs a locally-read, user-visible project command, not attacker input.
- **CORS/origin:** mutating endpoints reject foreign/absent Origin (403); ACAO reflected only for exact loopback origin + matching port; no wildcard.
- **XSS in frontend DNS rendering:** network-derived signals rendered via `textContent`/`createElement`; static fallback string is a literal.
- **Path traversal elsewhere:** only two request-derived filesystem reads (static routes), both now contained. `save-review` writes a fixed filename.
- **Dependencies:** `npm audit --omit=dev` → 0 vulnerabilities.
- **No lint/typecheck/build config exists** in the project → those gates are N/A (not skipped silently).