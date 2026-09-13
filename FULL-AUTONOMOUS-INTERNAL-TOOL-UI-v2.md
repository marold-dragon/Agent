# FULL AUTONOMOUS INTERNAL TOOL UI — DESIGN-LOCKED REVISION

Repository:
D:\New Project

Authoritative sources, in priority order:

1. PRD-internal-tool.md
2. prompt-gemini-internal-tool.md
3. DESIGN.md
4. canonical content files referenced by the PRD
5. current repo state/evidence files

The previous implementation is NOT accepted merely because `acme-bookings.html` renders.

The current exported report is only one artifact.

Your task is to complete the full LOCAL browser application and implement DESIGN.md faithfully.

## Mandatory first step

Before editing:

- read DESIGN.md completely
- read PRD-internal-tool.md
- read prompt-gemini-internal-tool.md
- inspect git status
- inspect internal/tool
- inspect docs/ai/INTERNAL-TOOL-STATE.md
- inspect docs/ai/INTERNAL-TOOL-EVIDENCE.md
- inspect current browser implementation
- inspect actual localhost output

If current state claims COMPLETE but the root browser app/workflow required by DESIGN.md does not exist, immediately change:

STATUS: IN_PROGRESS
DOD: NOT_YET

## The product you must leave behind

A local-only operator workspace:

WORKSPACE
→ EVIDENCE INTAKE
→ REVIEW 12 ITEMS
→ DOMAIN/DNS SUPPORTING SIGNALS
→ REPORT PREVIEW
→ HTML/PDF EXPORT

The application is the tool.
The report is an output artifact.

Do not stop at a generated HTML report.

## Design lock

Implement DESIGN.md as the authoritative UI/UX source.

Core visual direction:

- Together-inspired connected-system logic
- warm editorial canvas
- clean white working surfaces
- deep ink
- limited violet/magenta/orange/sky connected-node accents
- strong geometric/editorial hierarchy
- compact technical density
- thin rules
- modest radii
- minimal shadows
- evidence-first layout
- no generic admin-dashboard card soup
- no dark dossier
- no glassmorphism
- no neon
- no decorative gradients
- no giant rounded cards
- no AI orb/sparkle slop
- no Together AI brand cloning

Do not use Together AI's logo, assets, copy, proprietary illustrations, or font files.

## Core functional requirements

Evidence Intake:
- load local evidence.json
- load canonical sample
- validate schema
- show 12 items
- show environment variable names only
- no auto-upload

Review:
- exactly 12 canonical items
- 4 canonical categories
- submitted evidence
- provenance
- human notes
- recommendation
- manual status selector
- exactly:
  SUPPORTED
  ATTESTED
  NOT SUPPORTED
  NOT ASSESSED
- counts derived from actual state
- canonical sample = 6 / 2 / 3 / 1
- human decision must be explicit
- no software/AI verdict

Domain/DNS:
- public RDAP/DNS only
- supporting signals only
- never auto-change status
- never infer specific account ownership without evidence
- readable raw records
- privacy/redaction handled honestly

Report:
- browser preview
- professional editorial technical output
- 12 items
- 6/2/3/1 canonical sample
- disclaimers
- documented vs execution-tested distinction
- operational gaps
- HTML export
- PDF export if PRD requires it

## Test truthfulness

The owner previously ran:

npm.cmd test

and received:

Missing script: "test"

Therefore old PASS claims are not sufficient.

Fix package scripts truthfully.

At completion:

cd D:\New Project\internal\tool
npm.cmd test

must execute the real test suite.

Do not preserve an old 72/72 count unless the current command actually produces it.

Add browser E2E coverage for the real workspace.

## Browser requirement

Start the app as a persistent localhost-only process.

The root URL must open the workspace, not acme-bookings.html directly.

Open it in the owner's browser.

At the end print:

BROWSER READY
APP URL: <actual root localhost URL>
REPORT URL: <actual report URL>
SERVER PID: <actual pid>
START COMMAND: <exact command>
TEST COMMAND: <exact command>
TEST RESULT: <actual result>

Do not invent ports.

## Required browser verification

Use Playwright and Chrome DevTools.

Test at least:

Desktop:
- 1600x900
- 1440x900
- 1366x768
- 1280x800

Tablet:
- 1024x768
- 834x1194
- 768x1024

Mobile sanity:
- 430x932
- 390x844
- 360x800

Verify:

- root workspace loads
- no fatal console errors
- evidence sample loads
- 12 items visible
- statuses editable
- notes editable
- counts update
- canonical counts 6/2/3/1
- status change modifies count
- restoring status restores count
- DNS lookup UI works
- supporting-signal warning visible
- report preview works
- HTML export works
- PDF export works if required
- no unexpected Module A/B external network calls
- responsive layout does not break

Capture screenshots to:

docs/audit/internal-tool-browser/

## Module A

Actually run the CLI evidence collector.

Verify:

- install/build capture
- env var NAME extraction only
- ownership matrix
- manual dependencies
- 12 canonical items
- valid local evidence.json
- no auto-send
- no HTTP/upload/telemetry
- no secret values
- safe CLI errors

Do not replace Module A with browser behavior.

## Delegation

Use holver-fast for repetitive verification.

Use independent-review / opencode/mimo-v2.5-free for hostile final verification.

Do not invoke holver-review-38 until that provider route is independently healthy.

The independent reviewer must inspect the real browser app, real test output, generated report, network behavior, responsive states, and DESIGN.md compliance.

If it finds bugs:

FIX
→ RETEST
→ BROWSER VERIFY
→ REVIEW AGAIN

## Evidence

Maintain:

docs/ai/INTERNAL-TOOL-STATE.md
docs/ai/INTERNAL-TOOL-EVIDENCE.md
docs/ai/INTERNAL-TOOL-DESIGN-SOURCE.md
docs/audit/INTERNAL-TOOL-BROWSER-ACCEPTANCE.md

The design-source file must state that DESIGN.md was derived from an audit of Together AI principles but intentionally does not copy its proprietary brand assets.

## Completion gate

Do not mark complete until ALL are true:

- root browser workspace exists
- DESIGN.md visibly implemented
- Module A actually runs
- evidence import works
- 12-item review works
- manual status decision is clear
- canonical 6/2/3/1 works
- domain signals remain non-verdict supporting evidence
- report preview works
- HTML export works
- PDF export works if required
- npm.cmd test works
- browser E2E works
- Playwright passes
- Chrome DevTools checks pass
- responsive sanity passes
- Modules A/B have no unexpected outbound network
- independent hostile review completes
- actionable P0/P1 bugs are fixed
- evidence files updated
- nothing is deployed/published

Only then:

STATUS: COMPLETE
DOD: PASS

Otherwise:

STATUS: IN_PROGRESS
DOD: NOT_YET

## Autonomy

Continue autonomously.

Do not ask permission for local source edits, local server startup, local browser automation, tests, screenshots, HTML/PDF generation, package script repairs, bug fixes, or subagent delegation.

Do not stop because:
- a report HTML exists
- one screenshot looks okay
- one test run is green
- an old state file says COMPLETE
- one model response ends

Finish the application, verify it, re-audit it, then stop.
