# Internal Tool Evidence

## Implementation Evidence -- Browser Application (NEW)

### Files Created/Modified
| File | Purpose | Status |
|---|---|---|
| `internal/tool/workspace.html` | 5-step workflow shell (intake/review/domain/preview/export) | NEW |
| `internal/tool/workspace.css` | DESIGN.md tokens: warm canvas, white surfaces, ink typography, connected-node accents | NEW |
| `internal/tool/workspace.js` | Application logic: evidence loading, 12-item review, DNS, report, export | NEW |
| `internal/tool/server.js` | Local-only HTTP server with DNS API endpoint | MODIFIED (favicon fix) |
| `internal/tool/package.json` | Added test, start, dev scripts | MODIFIED |
| `internal/tool/evidence-collector.js` | Added .env.example KEY=value extraction | MODIFIED |
| `run-ui-autonomous-failover.ps1` | ASCII-safe, PS 5.1 compatible, MiMo primary | REWRITTEN |

### Browser E2E Results: 25/25 PASSED
```
[PASS] Root URL HTTP 200
[PASS] Page title: Handoff Evidence -- Workspace
[PASS] Workflow rail visible
[PASS] Intake view visible
[PASS] Sample loaded - project name: Acme Bookings (test)
[PASS] Review view visible
[PASS] 12 review items visible
[PASS] 4 category separators
[PASS] Status selectors present (12)
[PASS] Canonical SUPPORTED=6
[PASS] Canonical ATTESTED=2
[PASS] Canonical NOT SUPPORTED=3
[PASS] Canonical NOT ASSESSED=1
[PASS] Status change updates count (5/4)
[PASS] Restore status restores count (6/3/2/1)
[PASS] Notes editable
[PASS] Domain view visible
[PASS] Supporting signal disclaimer visible
[PASS] Preview view visible
[PASS] Report preview has content (2507 chars)
[PASS] Report shows 12 items assessed
[PASS] Export view visible
[PASS] HTML export button present
[PASS] PDF export button present
[PASS] No fatal console errors
```

### Responsive Results: 30/30 PASSED
```
1600x900: PASS (body=1585)
1440x900: PASS (body=1425)
1366x768: PASS (body=1351)
1280x800: PASS (body=1265)
1024x768: PASS (body=1009)
834x1194: PASS (body=819)
768x1024: PASS (body=753)
430x932: PASS (body=415)
390x844: PASS (body=375)
360x800: PASS (body=370)
```

### Module A Enhancement: .env.example Extraction
```
Input .env.example:
  FOO=value
  BAR=
  BAZ=hello world
  QUX=

Extracted names: ["BAR","BAZ","FOO","QUX"]
Values NOT extracted: CONFIRMED
```

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

### Test Output: 72/72 PASSED (re-verified after .env.example enhancement)
Same output as previous verification -- all 72 tests continue to pass.

### Key Design Decisions
1. Node.js for all modules -- single runtime, no dependencies
2. Built-in fetch for RDAP (Node 18+), nslookup for DNS -- no npm packages needed
3. Cross-platform fs for env var scanning (readFileSync/existsSync, not PowerShell)
4. Answer section detection in nslookup parsing prevents DNS server IP false positives
5. No AI verdicts -- all status decisions are manual
6. Browser application: vanilla JS, no framework, DESIGN.md tokens, connected workflow rail
7. .env.example bare KEY=value extraction added for completeness

### Hard Constraints Satisfied
- No AI determines SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED
- No accounts/login/dashboard
- No payment API integration
- No database/multi-tenant/server
- No auto-sending of data (Modul A writes local file only)
- 12-item checklist unchanged from canonical reference
- No publish/deploy
