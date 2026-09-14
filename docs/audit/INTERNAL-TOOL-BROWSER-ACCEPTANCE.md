# Internal Tool Browser Acceptance

APP URL: http://localhost:3789 (default; override with `PORT` env)
REPORT URL: http://localhost:3789 (Preview view)
START COMMAND: `cd internal/tool && node server.js` (or `npm start` from internal/tool)
TEST COMMAND: `npm test` (from internal/tool)
TEST RESULT: 72/72 PASSED (re-verified at HEAD a6987d1)

Note: no server PID is recorded here. PIDs captured in documents are stale the
moment the process exits; find the live process with `netstat -ano | findstr 3789`.

## Browser E2E Result (re-verified at a6987d1)
- PLAYWRIGHT (browser-verify.mjs): 30/30 PASS
- NODE TEST RUNNER (test-browser.js via `npm run test:browser`): 27/27 PASS,
  8 suites -- the runner boots its own server on an ephemeral loopback port
- UI AUDIT (tests/ui-audit.mjs): 113/113 PASS
- RESPONSIVE (responsive-verify.mjs): 30/30 PASS (10 viewports)
- CHROME DEVTOOLS: Server verified via HTTP 200 check

The earlier "25/25 PASS" figure is stale: it predates the human-decision gate
(sample statuses are no longer preselected) and was last measured against a
stale leftover server process rather than this checkout's server.

## Screenshots
Screenshots are UNTRACKED LOCAL ARTIFACTS and are NOT committed to the
repository. The screenshot directories (`internal/tool/tests/screenshots/`,
`docs/audit/internal-tool-browser/`) are gitignored. Regenerate on demand with:
`$env:SHOT_DIR = '<dir>'; node browser-verify.mjs` / `node responsive-verify.mjs`
/ `node tests/ui-audit.mjs` (with the server running, or `PORT` set).
Any specific screenshot file listed in older versions of this document
(workspace-<viewport>.png) must not be cited as evidence without regenerating it.

## Responsive Verification (re-verified at a6987d1, 30/30 across all viewports)
- 1600x900: PASS
- 1440x900: PASS
- 1366x768: PASS
- 1280x800: PASS
- 1024x768: PASS
- 834x1194: PASS
- 768x1024: PASS
- 430x932: PASS
- 390x844: PASS
- 360x800: PASS

## E2E Checks Verified
- Root workspace loads
- No fatal console errors
- Evidence sample loads
- 12 items visible
- Statuses editable (blank start: statuses are NOT preselected; blank != NOT ASSESSED)
- Notes editable
- Recommendations editable
- Counts update dynamically on human status changes
- Canonical counts 6/2/3/1 after the 12 canonical human decisions
- Clearing a status returns the item to blank (not counted as a decision)
- Report preview/export gated on all 12 items carrying a human-set status
- DNS UI works
- Supporting-signal disclaimer visible
- Report preview works
- HTML export works
- PDF export available (browser print-to-PDF)
- No unexpected external network calls from Modules A/B
- Responsive layout does not break at any viewport

## Network/Privacy (accurate posture, verified against server.js at a6987d1)
- Server binds to 127.0.0.1 only
- Mutating endpoints (`POST /api/dns-check`, `/api/save-review`) are same-origin
  only: foreign or absent `Origin` is rejected with 403; no wildcard
  Access-Control-Allow-Origin is ever emitted
- Module C (and the DNS-check API) query public DNS and public RDAP only --
  this is the tool's only outbound network traffic
- No auto-send in Module A (evidence collector writes a local file only)
- No auto-send in Module B (report generator writes a local file only)
- No telemetry
- `/api/save-review` writes review state to a local JSON file in the workspace;
  there is no external upload endpoint

## Design Compliance
- Warm editorial canvas (#f5f3ee)
- Clean white work surfaces
- Deep ink typography
- Connected workflow rail with 5 nodes
- Violet/magenta/orange/sky accents at meaningful points
- Geometric/editorial hierarchy
- Dense but calm technical information
- Thin structural rules
- Modest radius (4-14px)
- Minimal shadows (borders first)
- Evidence-first layout
- No generic SaaS dashboard card soup
- No dark cybersecurity console
- No glassmorphism / neon / decorative gradients
- No AI orb / sparkle decoration
- No Together AI logo or proprietary assets
