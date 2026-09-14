# Internal Tool Evidence

All results in this file were re-verified at HEAD a6987d1 (win32, Node v24.19.0,
Chromium 1243 via Playwright). See docs/ai/INTERNAL-TOOL-STATE.md for the
run-configuration details and outstanding items. Counts quoted elsewhere as
"25/25 browser E2E" or "99 total" are stale and superseded by the tables below.

## Implementation Evidence -- Browser Application

### Files Created/Modified
| File | Purpose | Status |
|---|---|---|
| `internal/tool/workspace.html` | 5-step workflow shell (intake/review/domain/preview/export) | NEW |
| `internal/tool/workspace.css` | DESIGN.md tokens: warm canvas, white surfaces, ink typography, connected-node accents | NEW |
| `internal/tool/workspace.js` | Application logic: evidence loading, 12-item review, DNS, report, export | NEW |
| `internal/tool/server.js` | Local-only HTTP server, same-origin-gated DNS/save APIs | MODIFIED |
| `internal/tool/package.json` | Scripts: test, test:browser, start, dev | MODIFIED |
| `internal/tool/run-browser-tests.mjs` | test:browser runner: boots server on ephemeral port, runs E2E, tears down | NEW |
| `internal/tool/evidence-collector.js` | Added .env.example KEY=value extraction (names only, no values) | MODIFIED |

(Note: `run-ui-autonomous-failover.ps1` from earlier sessions is a superseded local
runner and is intentionally NOT tracked in git; it is not part of the product.)

### Verified test results at a6987d1
| Suite | Result |
|---|---|
| test-modules.js (`npm test`) | 72/72 |
| tests/module-a-evidence-collector.js | 139/139 |
| tests/report-engine-semantics.test.js | 111/111 |
| tests/dns-checker.test.js | 93/93 |
| tests/security-server-dns.test.js | 43/43 |
| tests/residual-fix.test.js | 10/10 |
| test-browser.js (`npm run test:browser`) | 27/27 (8 suites) |
| browser-verify.mjs (Playwright) | 30/30 |
| responsive-verify.mjs (Playwright, 10 viewports) | 30/30 |
| tests/ui-audit.mjs (Playwright) | 113/113 |

### What browser-verify.mjs checks (30 assertions, updated to current semantics)
- Root URL HTTP 200; page title "Handoff Evidence -- Workspace"
- Workflow rail visible; intake view visible
- Sample loads (project "Acme Bookings (test)"); review view reachable
- 12 review items, 4 category separators, 12 status selects
- **Blank-start counts 0/0/0/12** -- the sample deliberately does NOT preselect
  statuses (human decision required; blank != NOT ASSESSED)
- A human status change updates the counts; clearing returns to blank
- Canonical 6/2/3/1 after the 12 canonical human decisions are set
- Domain view + "Supporting signal" disclaimer; preview has content and
  "12 items assessed"; export buttons present
- No fatal console errors

### test-browser.js checks (27 tests, 8 suites)
- Server serves workspace HTML/CSS/JS and sample data; DNS-check API happy path,
  400 on invalid domain, graceful handling of non-existent domain
- Canonical content constraints (12 items, 4 categories, 6/2/3/1 in
  sample-statuses.json)
- No external fetch/XHR in workspace.js; no send/upload code
- DESIGN.md structure (rail nodes, metrics, counts, tokens, print + responsive CSS)
- `npm run test:browser` boots server.js on an ephemeral loopback port, runs the
  suite with `BASE` pointing at it, and tears the server down (works on a clean
  checkout; POSTs carry a same-origin `Origin` header, matching browser behavior
  and the server's 403-on-foreign-origin gate)

### Responsive verification: 30/30 PASSED
Ten viewports (1600x900, 1440x900, 1366x768, 1280x800, 1024x768, 834x1194,
768x1024, 430x932, 390x844, 360x800) x three checks each: no horizontal overflow,
12 review items rendered, status selects accessible. Verified via
responsive-verify.mjs (30/30) and independently via the ui-audit.mjs Phase 2
overflow checks inside its 113/113.

### Screenshots
Screenshots are untracked local artifacts (gitignored
`internal/tool/tests/screenshots/` and `docs/audit/internal-tool-browser/`).
They are produced on demand by the harness via the `SHOT_DIR` env override and
are NOT committed to the repository. Do not cite a specific screenshot file as
evidence without re-generating it.

### Module A Enhancement: .env.example Extraction
Covered by tests/module-a-evidence-collector.js (139/139). The suite fixture
writes a `.env.example` containing `FOO=secret_value_12345`, empty `BAR=`,
`BAZ=another_secret_password`, `DATABASE_URL=postgresql://user:pass@host:5432/db`,
`API_KEY=sk-live-...`, `EMPTY_VAR=`, `NODE_ENV=production` and asserts that the
collector extracts variable NAMES only and never leaks any of the values.

## Original Module Evidence (unchanged)

### Files Created
| File | Purpose | Lines |
|---|---|---|
| `internal/tool/evidence-collector.js` | Modul A -- CLI Evidence Collector | ~385 |
| `internal/tool/report-generator.js` | Modul B -- Report Generator | ~414 |
| `internal/tool/dns-checker.js` | Modul C -- Domain/DNS Auto-Checker | ~325 |
| `internal/tool/test-modules.js` | Verification test suite | ~199 |
| `internal/tool/sample-evidence.json` | Sample evidence.json (12 items) | ~115 |
| `internal/tool/sample-statuses.json` | Sample statuses (6/2/3/1 distribution) | 14 |

### Key Design Decisions
1. Node.js for all modules -- single runtime, no runtime dependencies
2. Built-in fetch for RDAP (Node 18+), nslookup for DNS -- no npm packages needed
3. Cross-platform fs for env var scanning (readFileSync/existsSync, not PowerShell)
4. Answer section detection in nslookup parsing prevents DNS server IP false positives
5. No AI verdicts -- all status decisions are manual (sample statuses are NOT
   preselected; preview/export are gated on 12 human-set statuses)
6. Browser application: vanilla JS, no framework, DESIGN.md tokens, connected workflow rail
7. .env.example bare KEY=value extraction added for completeness
8. Server mutating APIs are same-origin only (foreign/absent Origin -> 403)

### Hard Constraints Satisfied
- No AI determines SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED
- No accounts/login/dashboard
- No payment API integration
- No database/multi-tenant/server
- No auto-sending of data (Modul A writes local file only)
- 12-item checklist unchanged from canonical reference
- No publish/deploy
