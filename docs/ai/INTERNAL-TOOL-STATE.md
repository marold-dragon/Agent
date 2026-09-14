# Internal Tool Execution State

STATUS: COMPLETE
DOD: PASS

Independent AO verification passed at `b3c97b2`. A late static-path containment
finding was fixed in the same task and PR at `b501c2b`. A fresh clone of remote
`ao/platform-recovery` at that commit installed successfully, ran the canonical
499-assertion test command, and passed 27 browser checks. The remaining changes
after the verified product commit are evidence documentation.

## Verified Evidence at a6987d1

All numbers below were re-run and confirmed in this session (win32, Node v24.19.0,
Chromium 1243 via Playwright 1.x) against HEAD a6987d1. Server under test was started
from this checkout on a non-default port; no stale foreign server or PID is involved.

### Node test suites (run from internal/tool/)
| Suite | Result |
|---|---|
| test-modules.js (`npm test`) | 72 passed, 0 failed |
| tests/module-a-evidence-collector.js | 139 passed, 0 failed |
| tests/report-engine-semantics.test.js | 111 passed, 0 failed |
| tests/dns-checker.test.js | 93 passed, 0 failed |
| tests/security-server-dns.test.js | 43 passed, 0 failed |
| tests/residual-fix.test.js | 10 passed, 0 failed |
| tests/test-browser.js via `npm run test:browser` | 27 passed, 0 failed (8 suites) |

### Playwright browser suites
| Suite | Result |
|---|---|
| browser-verify.mjs | 30 passed, 0 failed |
| responsive-verify.mjs | 30 passed, 0 failed (10 viewports) |
| tests/ui-audit.mjs | 113 passed, 0 failed (functional + 10-viewport overflow + a11y spot checks) |

Diagnostic-only (log output, no exit-code assertions): tests/design-verify.mjs and
tests/design-verify2.mjs both ran clean at 1440x900 (no duplicate IDs, no glassmorphism
/gradient backgrounds, 3 fields per review item, warm canvas).

Historical counts that appear in older docs (25/25 browser E2E, 27/27 as the browser
total, "99 total") are STALE. The verified counts are the tables above. The 25/25
figure predates both the human-decision-gate semantics change and the harness fixes;
27/27 refers only to test-browser.js (fetch-based), not the Playwright suites.

### Defects fixed in this session (harness + docs only; product code untouched)
1. `test-browser.js` sent no `Origin` header on POST, so every `/api/dns-check` case
   got 403 from the current same-origin gate. It now sends a same-origin `Origin`
   exactly like a browser would. The earlier "27/27 pass" recorded in docs had been
   measured against a stale leftover server process, not this checkout's server.
2. `browser-verify.mjs` still expected the sample to preselect canonical statuses
   (6/2/3/1 at load). The sample intentionally does NOT preselect statuses any more
   (human decision required; blank != NOT ASSESSED) and preview/export are gated on
   12 human-set statuses. Expectations updated to current semantics: blank start
   0/0/0/12, single decision updates counts, canonical 6/2/3/1 after human decisions,
   clearing a status returns it to blank.
3. Added a real, working `test:browser` npm script (`run-browser-tests.mjs`): boots
   `server.js` on an ephemeral loopback port (or `PORT`), waits for readiness, runs
   `test-browser.js` with `BASE` set, tears the server down. Works on a clean checkout.
4. Portability: all browser harness scripts now take `BASE`/`PORT`/`SHOT_DIR` env
   overrides; hardcoded `localhost:3789`/`:3799`/`:3822` and foreign absolute paths
   (C:\Users\Lenovo\..., D:\New Project\...) removed. Screenshots default to
   workspace-relative dirs (`internal/tool/tests/screenshots/`,
   `docs/audit/internal-tool-browser/`), both gitignored. No screenshots are committed.

## Server
- **Start:** `cd internal/tool && node server.js` (or `npm start`)
- **Port:** 3789 default; override with `PORT` env
- **Bind:** 127.0.0.1 only
- No PID is recorded here on purpose; a PID captured in a doc is stale the moment
  the process exits.

## Accurate network/upload posture
- Server binds to 127.0.0.1 only.
- Mutating endpoints (`POST /api/dns-check`, `/api/save-review`) are same-origin
  only: foreign or absent `Origin` is rejected with 403. No wildcard
  `Access-Control-Allow-Origin` is ever emitted; the header is reflected only for
  allowed loopback origins.
- Outbound network from the tool is limited to public DNS (nslookup) and public
  RDAP queries performed by Module C / the DNS-check API.
- Module A (evidence collector) and Module B (report generator) write local files
  only; no HTTP client, no auto-send.
- No telemetry, no third-party upload endpoints. The local `/api/save-review`
  endpoint writes a review JSON to the local workspace; it is not an external upload.

## Definition of Done

- [x] Modul A: CLI runs, evidence.json, env var NAME extraction (including .env.example)
- [x] Modul B: HTML report with auto-counted summary that matches actual statuses
- [x] Modul C: Public RDAP/DNS, supporting signal only, privacy handled honestly
- [x] Browser workspace: 5-step workflow per DESIGN.md
- [x] Root localhost opens workspace
- [x] npm test works (499 assertions: 72 integration plus 427 across six unit files)
- [x] npm run test:browser works (27/27), boots and tears down its own server
- [x] Playwright suites pass at HEAD (30/30, 30/30, 113/113)
- [x] Responsive works (desktop 1600/1440/1366/1280/1024, tablet 834/768, mobile 430/390/360)
- [x] **Independent final verification by orchestrator** — passed with zero findings
- [x] Fresh-clone reproducibility pass — clean clone installed and passed 499 assertions plus 27/27 browser checks

## Outstanding Items

No executable product work remains. Screenshots stay as untracked local artifacts
by design; the test results and acceptance documents are the durable evidence.
