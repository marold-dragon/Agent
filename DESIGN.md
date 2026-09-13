# DESIGN.md — Handoff Evidence Internal Tool
## Together-inspired Connected Evidence System

**Status:** Authoritative UI/UX design source for the local Handoff Evidence Internal Tool  
**Scope:** Local operator workspace for Evidence Intake, 12-item Review, Domain/DNS supporting signals, Report Preview, HTML/PDF Export  
**Reference audit:** Together AI website + Together AI brand/new-look materials, audited September 2026  
**Important:** This system is *inspired by design principles* observed on Together AI. It must not copy Together AI's logo, proprietary assets, trademarked brand expression, exact illustrations, or licensed typeface.

---

## 1. Why this design direction

Together AI's current visual system is effective because it makes a deeply technical platform feel clear, energetic, and connected rather than visually heavy.

The transferable idea is not "make Handoff Evidence look like Together AI."

The transferable idea is:

> **Make complex technical evidence feel like a connected system of understandable signals.**

The Handoff Evidence Internal Tool should therefore feel:

- technical without looking like an admin template
- editorial without looking like a document editor
- operational without looking like enterprise ERP
- colorful enough to communicate system relationships
- restrained enough that evidence remains the hero

The application is a **human review workspace**, not a marketing landing page.

---

# 2. Together AI audit — observed design language

## 2.1 Brand idea: connectedness

Together AI describes its 2026 visual language as an expression of **connectedness**: research, infrastructure, builders, and products becoming more powerful when connected.

This is the most important principle to adapt.

For Handoff Evidence, translate connectedness into:

- Evidence → Review → Supporting Signals → Report → Export
- submitted evidence connected to a human decision
- operational dependencies shown as relationships, not isolated cards
- workflow progress visible as a connected system

Do not turn every piece of information into an independent rounded card.

---

## 2.2 Brand geometry

Together AI's current identity uses interconnected geometric forms and a logo built from multiple colorful connected circles.

Observed visual qualities:

- circles / discs / nodes
- linked forms
- geometric intersections
- clear directional relationships
- bold but limited accent colors
- abstract technical imagery rather than literal stock photography

Adaptation for Handoff Evidence:

- use small connection nodes, rails, lines, and flow markers
- use connected evidence groups
- use subtle visual links between submitted evidence, supporting signals, and manual verdict
- avoid decorative 3D illustration unless it serves actual information

The tool does **not** need hero 3D art.

---

## 2.3 Typography

Together AI's official primary typeface is **The Future**, a geometric typeface informed by Futura.

Do not copy or bundle that commercial/proprietary font unless it is already licensed for this project.

Handoff adaptation:

### Primary UI family

Use an available geometric sans:

```css
font-family:
  "Manrope",
  "Inter",
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Preferred:
- Manrope for display / headings when available
- Inter/system for dense interface copy if it produces better readability

Do not introduce a new font dependency if the local tool already has a stable high-quality sans.

### Monospace

For evidence keys, command output, DNS records, environment variable names:

```css
font-family:
  "IBM Plex Mono",
  "SFMono-Regular",
  Consolas,
  "Liberation Mono",
  monospace;
```

Fallback is acceptable.

---

## 2.4 Editorial hierarchy

Together AI's homepage uses a strong two-level narrative:

1. a short, large core statement
2. dense technical proof beneath it

It also uses metric-forward sections such as large performance percentages and grouped technical product categories.

Adapt this hierarchy:

### Level 1 — decision / state

Examples:

- `Review 9 of 12`
- `3 operational gaps`
- `Evidence loaded`
- `Ready to export`

These should be visually prominent.

### Level 2 — proof

Examples:

- submitted evidence
- command/build result
- ownership input
- DNS/RDAP signals
- reviewer note
- execution-tested distinction

Proof should be dense, structured, and easy to inspect.

---

## 2.5 Data density

Together AI's pricing and product surfaces demonstrate that technical density does not require a "dashboard card soup" layout.

Adaptation:

- tables are allowed
- compact rows are preferred over oversized cards for repeated evidence
- use section headers and rules to organize dense content
- use tabs/segmented navigation when there are real modes
- large numbers should summarize, not dominate every screen

---

## 2.6 Color strategy

Together AI's identity uses multiple foundational color families and colorful connected forms.

Handoff Evidence should borrow the **multi-node energy**, not copy the exact brand palette.

The application stays mostly neutral. Accent color appears at workflow nodes, active controls, signal relationships, and limited emphasis.

---

# 3. Handoff Evidence visual concept

## Name

**Connected Evidence Workspace**

## Design sentence

> A warm, editorial technical workspace where submitted evidence, public supporting signals, and human review decisions are visibly connected without allowing software to become the judge.

## Mood

- precise
- calm
- modern
- human-reviewed
- research-like
- operational
- transparent
- not intimidating

---

# 4. Design tokens

These are Handoff-specific implementation tokens derived from the audited principles. They are **not claimed to be Together AI's exact color values**.

## 4.1 Color tokens

```css
:root {
  /* Canvas */
  --bg-canvas: #f5f3ee;
  --bg-canvas-subtle: #faf9f6;
  --surface: #ffffff;
  --surface-raised: #fffefa;
  --surface-soft: #f0eee8;

  /* Ink */
  --ink-strong: #17171a;
  --ink: #2d2d31;
  --ink-muted: #706d68;
  --ink-faint: #96918a;

  /* Rules */
  --line: #d9d5ce;
  --line-strong: #bbb6ae;
  --line-soft: #ebe8e2;

  /* Connected-system accents */
  --node-violet: #6f62ff;
  --node-magenta: #d65ca8;
  --node-orange: #f08a45;
  --node-sky: #98c8f8;
  --node-sky-soft: #eaf4ff;
  --node-violet-soft: #efedff;
  --node-orange-soft: #fff0e5;

  /* Semantic statuses */
  --supported: #158255;
  --supported-soft: #e9f7f0;

  --attested: #9a6716;
  --attested-soft: #fff5db;

  --not-supported: #c13f36;
  --not-supported-soft: #fff0ee;

  --not-assessed: #686b72;
  --not-assessed-soft: #f0f1f3;

  /* Interaction */
  --focus: #6658f5;
  --selection: #ece9ff;
}
```

### Rules

- Never use accent colors as large full-screen backgrounds.
- Use violet/magenta/orange/sky to describe workflow or connections.
- Use semantic colors only for evidence status.
- Never use violet merely to make a component "look AI."
- Status meaning must remain understandable without color alone.

---

## 4.2 Typography scale

```css
--text-11: 0.6875rem;
--text-12: 0.75rem;
--text-13: 0.8125rem;
--text-14: 0.875rem;
--text-16: 1rem;
--text-18: 1.125rem;
--text-22: 1.375rem;
--text-28: 1.75rem;
--text-36: 2.25rem;
--text-48: 3rem;
```

Recommended usage:

- App title: 28–36
- Workspace section headline: 22–28
- Decision metric: 28–48 depending on context
- Item title: 14–16 / semibold
- Body: 14–16
- Evidence metadata: 12–13
- Labels: 11–12 / medium, optional uppercase with tracking

Avoid 60–90px marketing headlines inside the operator application.

---

## 4.3 Spacing

Use an 8px base rhythm.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

Dense repeated evidence rows can use 12–16px vertical padding.

Major workspace sections use 32–48px separation.

---

## 4.4 Radius

Together-inspired geometry should feel deliberate, not pill-heavy.

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
```

Rules:

- tables and large work areas: 8–12px
- inputs: 6–8px
- buttons: 6–8px
- status tags: 4–6px
- avoid 20–32px rounded cards
- avoid pill buttons except true compact filters/toggles

---

## 4.5 Shadows

Use borders first.

```css
--shadow-1: 0 1px 2px rgba(20, 20, 24, 0.06);
--shadow-2: 0 8px 24px rgba(20, 20, 24, 0.07);
```

Most panels should use `border + subtle surface contrast`, not shadow.

---

# 5. Application shell

Do **not** build a generic left-sidebar admin dashboard unless evidence from the existing project architecture requires it.

Preferred shell:

```text
┌─────────────────────────────────────────────────────────────┐
│ Handoff Evidence                         Project / Utilities │
├─────────────────────────────────────────────────────────────┤
│  Intake ─── Review ─── Domain signals ─── Preview ─── Export│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   active working canvas                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Top bar

Height:
- 56–64px desktop

Contains:
- product mark/name
- active project
- local-only indicator
- utility actions

Do not create fake notifications, billing, teams, or avatar menus.

## Workflow rail

This is the key Together-inspired connected element.

Five connected nodes:

1. Intake
2. Review
3. Domain signals
4. Preview
5. Export

Properties:

- horizontal on desktop
- compact and scrollable/stacked on small screens
- thin connecting rule between nodes
- active node may use violet
- completed node uses ink + subtle check
- supporting-signal node can use sky
- export node can use restrained orange

The rail is functional navigation, not decoration.

---

# 6. Home / Workspace

The root localhost URL must open the actual workspace.

Do not open directly to an exported report.

## Structure

### Header block

Left:
- `Handoff Evidence`
- current project
- one sentence context

Right:
- local-only indicator
- `Load evidence`
- optional `Load sample`

### Decision summary strip

Use 3–4 large but compact metrics:

```text
12 items     9 reviewed     3 gaps     Ready / Not ready
```

Do not put each metric in a huge rounded card.

Use a shared ruled strip or modular grid.

### Current flow

Display the connected workflow rail.

### Resume area

Show:
- current review progress
- most recent evidence file
- unresolved items
- latest domain check
- report/export availability

---

# 7. Evidence Intake

## Visual behavior

Evidence Intake should feel like opening a technical dossier, not uploading to a cloud service.

Main panel:

```text
Evidence file
────────────────────────────────────────
Acme Bookings
captured 2026-...
12 checklist items
14 environment variable names
install result
build result

[ Choose local evidence.json ]
[ Load canonical sample ]
```

Secondary evidence details can use disclosure rows.

## Local-only reassurance

Visible microcopy:

> File remains in this browser/local process. It is not uploaded automatically.

Do not overemphasize with scary security banners.

---

# 8. Review Workspace — primary screen

This is the most important application screen.

Do not use twelve large cards.

Use a structured evidence-review table/list.

## Desktop layout

```text
┌────────┬────────────────────────┬─────────────────────────────┬──────────────┐
│ Item   │ Submitted evidence     │ Human review                │ Status       │
├────────┼────────────────────────┼─────────────────────────────┼──────────────┤
│ 01     │ repository evidence    │ notes + recommendation      │ SUPPORTED    │
│ 02     │ domain evidence        │ notes + recommendation      │ NOT SUPPORTED│
└────────┴────────────────────────┴─────────────────────────────┴──────────────┘
```

A row can expand to expose full evidence.

## Category separators

Use full-width editorial section rules:

```text
A — Ownership and Control
B — Reproducibility
C — Operations
D — Known Manual Dependencies
```

Avoid card-within-card nesting.

## Status selector

Exactly four values:

- SUPPORTED
- ATTESTED
- NOT SUPPORTED
- NOT ASSESSED

Recommended control:
- compact select or segmented popover
- not four giant colored buttons

Show an explicit label:

`Human decision`

Software must never preselect a status based on DNS/RDAP or build evidence.

## Evidence provenance

Show source labels such as:

- Submitted
- Execution output
- Public supporting signal
- Reviewer note

These are metadata tags, not statuses.

---

# 9. Summary module

Inspired by Together AI's metric-forward hierarchy.

The summary should be highly legible but compact.

Example:

```text
12 reviewed

6 Supported       2 Attested
3 Not supported   1 Not assessed
```

Use the numbers as the strongest typographic layer.

Avoid donut charts unless they genuinely improve comprehension.

Preferred:
- text + horizontal proportion rail
- four small proportional segments
- counts remain readable without relying on color

---

# 10. Domain / DNS supporting-signal screen

This screen must visually reinforce that public data is **supporting evidence**.

## Header

```text
Domain / DNS
Public supporting signals
```

Persistent notice:

> Supporting signal only. Public infrastructure data does not determine the final checklist status.

## Result layout

Use a two-column technical inspection view:

Left:
- domain
- RDAP state
- registrar
- privacy/redaction

Right:
- nameservers
- A records
- CNAME
- lookup warnings/errors

Use monospace for records.

Never visually connect the result directly to a green/red final status.

A user can copy useful signals into review notes manually.

---

# 11. Report Preview

The current plain report table should be upgraded into an editorial technical report.

The report is an artifact, not the application shell.

## Report canvas

- white paper-like surface
- warm page background outside
- max reading width 880–1040px on screen
- print-safe structure
- minimal chrome
- strong section rules

## Header

```text
HANDOFF EVIDENCE REPORT

Acme Bookings
Human-reviewed submitted evidence

Prepared by ...
Evidence collected ...
Report generated ...
```

Use a restrained connected-node motif at the top or side.

Do not copy Together AI's logo shapes.

## Scope callout

Use a subtle bordered editorial callout, not a gray bootstrap alert.

## Checklist

Desktop:
- structured table is acceptable

Print:
- maintain row integrity where possible
- repeat table header across pages if supported
- avoid page breaks inside key sections

## Summary

Use a compact accent block with the four totals.

## Operational gaps

Prefer explicit structured findings:

```text
03  Hosting / deployment control
NOT SUPPORTED
Recommended action: ...
```

rather than a generic bullet list.

---

# 12. Buttons

## Primary

- deep ink background or violet accent depending on context
- white text
- 6–8px radius
- 36–42px height

Primary product actions:
- `Load evidence`
- `Generate report`
- `Export PDF`

## Secondary

- surface
- 1px rule
- ink text

## Tertiary

- text/button treatment
- no floating colored pills

## Destructive

Only if actual destructive action exists.

Do not invent destructive actions.

---

# 13. Forms

Labels above controls.

Inputs:

- white background
- 1px neutral border
- subtle focus ring in violet
- 38–42px standard height
- textareas sized to actual review work

For notes/recommendations:

- support comfortable multiline editing
- avoid tiny dashboard textareas

Validation:
- inline
- specific
- non-modal when possible

---

# 14. Tables and repeated rows

Use Together-inspired technical density.

Rules:

- sticky header is acceptable for long review tables
- 12–14px row typography
- 48–72px minimum row height depending on content
- strong category separators
- subtle row hover
- no zebra striping unless testing proves it improves scanning
- no horizontal overflow at desktop widths

On smaller screens:
- transform each item into a structured stacked row
- do not simply squeeze all columns

---

# 15. Icons and graphics

Use simple line icons only when they clarify function.

Do not add an icon to every label.

Connection motif:
- 4–8px nodes
- 1px or 1.5px lines
- color appears only at meaningful system points

No:
- glowing AI orb
- sparkles everywhere
- stock shield graphics
- gradient robot imagery
- abstract 3D art competing with evidence

---

# 16. Motion

Motion should communicate state changes.

Allowed:

- 120–180ms hover/focus
- 180–240ms panel expansion
- subtle node progress transition
- count update transition if not distracting

Avoid:

- hero animation
- parallax
- floating decorative shapes
- perpetual pulsing
- unnecessary loading shimmer

Respect `prefers-reduced-motion`.

---

# 17. Responsive system

## Desktop — primary target

Test:
- 1600x900
- 1440x900
- 1366x768
- 1280x800

Use:
- max app canvas 1440–1560px
- 24–40px outer gutter

## Tablet

Test:
- 1024x768
- 834x1194
- 768x1024

Adapt:
- workflow rail may become compact horizontally scrollable
- review columns may collapse into evidence/review vertical pairs

## Mobile sanity

Test:
- 430x932
- 390x844
- 360x800

The tool is desktop-first, but must remain usable.

Requirements:
- no page-level horizontal overflow
- no 10px unreadable report text
- no clipped status control
- no overlapping field labels
- exported report preview may use an intentional document viewport

---

# 18. Accessibility

Minimum:

- WCAG AA contrast for normal text where practical
- visible keyboard focus
- all status selectors keyboard-operable
- labels linked to controls
- native semantics before custom ARIA
- status meaning includes text, not color alone
- error state includes message, not red border only
- 44px recommended touch target where the mobile layout presents primary actions
- reduced motion respected

Do not claim full compliance without actual audit.

---

# 19. Print / PDF design

The exported report must not look like a screenshot of the app.

Print rules:

- remove app navigation
- white paper
- dark text
- preserve semantic status labels
- use thin neutral rules
- prevent orphaned headings
- use print-safe status indicators
- ensure URLs/long technical values wrap
- no interactive controls in export
- no hidden critical content

HTML preview and PDF export should share report semantics while allowing print-specific CSS.

---

# 20. Page/state requirements

The local application must have, either as routes or clear application states:

1. Workspace
2. Evidence Intake
3. Review
4. Domain / DNS
5. Report Preview
6. Export

Required empty states:

- no evidence loaded
- malformed evidence
- DNS not checked
- DNS lookup failed
- no review completed
- report not generated

Required success states:

- evidence loaded
- review complete
- domain signals available
- HTML generated
- PDF generated

---

# 21. Canonical content constraints

For the current internal-tool scope:

- exactly 12 canonical checklist items
- exactly 4 categories
- sample report:
  - 6 SUPPORTED
  - 2 ATTESTED
  - 3 NOT SUPPORTED
  - 1 NOT ASSESSED

Do not change these in the name of visual design.

Do not allow the visual layer to make software look like it produced a verdict automatically.

---

# 22. Anti-patterns

Reject implementation if it becomes:

- a generic analytics dashboard
- a wall of cards
- a dark cybersecurity console
- a marketing landing page
- a spreadsheet clone
- a plain Bootstrap report
- a rainbow status UI
- a Together AI visual clone
- a design where decorative shapes have more visual weight than evidence

---

# 23. Implementation acceptance

A design implementation is not complete until:

- root localhost URL opens the workspace, not only a report file
- evidence intake is usable
- all 12 items are reviewable
- manual status selection is obvious
- counts update dynamically
- canonical 6/2/3/1 is reproduced
- domain signals are visibly separate from verdicts
- report preview reflects the same review state
- HTML export works
- PDF export works when required by PRD
- visual hierarchy follows this DESIGN.md
- Playwright checks desktop/tablet/mobile
- Chrome DevTools shows no fatal console errors
- no unexpected network calls from Modules A/B
- independent reviewer verifies actual browser output
- screenshots are captured for evidence

---

# 24. Design QA checklist

Before marking design complete, verify:

### Shell
- real workspace root exists
- navigation is workflow-oriented
- local-only context is visible
- no fake SaaS chrome

### Visual system
- warm canvas
- white surfaces
- deep ink
- limited connected-node accent colors
- geometric/editorial hierarchy
- restrained radius
- thin rules
- no excessive shadows

### Review
- evidence remains dominant
- human decision clearly labeled
- status controls compact
- no accidental automatic-verdict implication

### Report
- professional editorial technical report
- readable at 100% zoom
- print-safe
- visually distinct from app shell

### Responsive
- no desktop overflow
- no tablet collisions
- no unusable mobile states

### Accessibility
- focus visible
- controls labeled
- status understandable without color
- contrast reviewed

---

# 25. Source audit summary

This design source was derived from a September 2026 audit of the current Together AI public site and official Together AI brand/new-look materials.

Observed transferable principles:

- a visual language centered on connectedness
- geometric modernist typography
- restrained neutral surfaces with energetic multi-color nodes
- large decisive statements followed by dense technical proof
- metric-forward hierarchy
- structured technical content and pricing/data tables
- product/research content presented as one connected ecosystem

Not transferred:

- Together AI logo
- exact Together AI color values
- proprietary illustrations
- trademark graphics
- The Future font files
- Together AI copy
- exact page compositions

The goal is to adopt the **system logic**, not duplicate the brand.
