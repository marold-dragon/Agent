#!/usr/bin/env node

/**
 * Modul B — Report Generator
 *
 * Runs locally on Martua's machine. Reads evidence.json + status assignments,
 * renders HTML/PDF report following the canonical Acme Bookings format.
 * Auto-calculates summary counts from actual data — never manual entry.
 *
 * Usage: node report-generator.js --evidence evidence.json --statuses statuses.json --output report.html
 *
 * statuses.json format:
 * {
 *   "repo-control": { "status": "SUPPORTED", "notes": "..." },
 *   "domain-dns-control": { "status": "NOT SUPPORTED", "notes": "..." },
 *   ...
 * }
 *
 * Valid statuses: SUPPORTED, ATTESTED, NOT SUPPORTED, NOT ASSESSED
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Canonical 12 items (must match 02-evidence-checklist-and-sample-report.md) ──

const CANONICAL_ITEMS = [
  {
    id: "repo-control",
    category: "A. Ownership and Control",
    label: "Repository control",
    order: 1,
  },
  {
    id: "domain-dns-control",
    category: "A. Ownership and Control",
    label: "Domain / DNS control",
    order: 2,
  },
  {
    id: "hosting-control",
    category: "A. Ownership and Control",
    label: "Hosting / deployment platform control",
    order: 3,
  },
  {
    id: "database-control",
    category: "A. Ownership and Control",
    label: "Database control",
    order: 4,
  },
  {
    id: "other-services",
    category: "A. Ownership and Control",
    label: "Other operational services",
    order: 5,
  },
  {
    id: "clean-install",
    category: "B. Reproducibility",
    label: "Clean install",
    order: 6,
  },
  {
    id: "production-build",
    category: "B. Reproducibility",
    label: "Production build",
    order: 7,
  },
  {
    id: "env-var-docs",
    category: "B. Reproducibility",
    label: "Environment-variable documentation",
    order: 8,
  },
  {
    id: "deployment",
    category: "C. Operations",
    label: "Deployment procedure",
    order: 9,
  },
  {
    id: "rollback",
    category: "C. Operations",
    label: "Rollback procedure",
    order: 10,
  },
  {
    id: "data-recovery",
    category: "C. Operations",
    label: "Data-recovery procedure",
    order: 11,
  },
  {
    id: "known-issues",
    category: "D. Known Manual Dependencies",
    label: "Known issues / manual processes",
    order: 12,
  },
];

const VALID_STATUSES = [
  "SUPPORTED",
  "ATTESTED",
  "NOT SUPPORTED",
  "NOT ASSESSED",
];

// ── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { evidence: null, statuses: null, output: "report.html" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--evidence") result.evidence = args[++i];
    if (args[i] === "--statuses") result.statuses = args[++i];
    if (args[i] === "--output") result.output = args[++i];
  }
  if (!result.evidence || !result.statuses) {
    console.error(
      "Usage: node report-generator.js --evidence evidence.json --statuses statuses.json [--output report.html]"
    );
    process.exit(1);
  }
  return result;
}

// ── Compute summary from actual status assignments ──────────────────────────

function humanAssessedCount(statusMap) {
  // Count only statuses a human actually set (any of the 4 canonical values,
  // including a deliberate NOT ASSESSED decision). A missing/blank status is
  // not a decision and must never be counted as one.
  let n = 0;
  for (const item of CANONICAL_ITEMS) {
    const entry = statusMap[item.id];
    if (entry && VALID_STATUSES.includes(entry.status)) n++;
  }
  return n;
}

function computeSummary(statusMap) {
  const counts = { SUPPORTED: 0, ATTESTED: 0, "NOT SUPPORTED": 0, "NOT ASSESSED": 0 };
  for (const item of CANONICAL_ITEMS) {
    const entry = statusMap[item.id];
    if (entry && VALID_STATUSES.includes(entry.status)) {
      counts[entry.status]++;
    } else {
      counts["NOT ASSESSED"]++;
    }
  }
  return counts;
}

// ── Generate HTML ───────────────────────────────────────────────────────────

function generateHTML(evidence, statusMap, summary, humanAssessed) {
  const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);
  const supportedCount = summary["SUPPORTED"];
  const attestedCount = summary["ATTESTED"];
  const notSupportedCount = summary["NOT SUPPORTED"];
  const notAssessedCount = summary["NOT ASSESSED"];

  // Honest assessment state: how many items carry a HUMAN-set status. Absent
  // items defaulted to NOT ASSESSED are not human decisions and must never be
  // presented as if they were.
  const assessed = typeof humanAssessed === "number" ? humanAssessed : totalItems;
  const incompleteNotice =
    assessed < totalItems
      ? `
  <div class="report-incomplete">
    <strong>Assessment incomplete.</strong>
    ${totalItems - assessed} of ${totalItems} items have no human-set status and are shown as NOT ASSESSED.
    This report is not a completed assessment and must not be presented as one until every item carries a human decision.
  </div>`
      : "";

  const project = evidence.projectInfo || {};
  const collectedAt = evidence.meta?.collectedAt || "unknown";

  // Build table rows
  let rows = "";
  let currentCategory = "";
  for (const item of CANONICAL_ITEMS) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      rows += `
        <tr class="category-header">
          <td colspan="4">${item.category}</td>
        </tr>`;
    }
    const entry = statusMap[item.id] || {};
    const status = entry.status || "NOT ASSESSED";
    const notes = entry.notes || "";
    const statusClass = status.toLowerCase().replace(/\s+/g, "-");
    rows += `
        <tr>
          <td class="item-num">${item.order}</td>
          <td class="item-label">${item.label}</td>
          <td class="item-status status-${statusClass}">${status}</td>
          <td class="item-notes">${escapeHTML(notes)}</td>
        </tr>`;
  }

  // Build dependencies list (items that are NOT SUPPORTED or ATTESTED)
  const deps = [];
  for (const item of CANONICAL_ITEMS) {
    const entry = statusMap[item.id] || {};
    const status = entry.status || "NOT ASSESSED";
    if (status === "NOT SUPPORTED" || status === "ATTESTED") {
      deps.push(`${item.label}: ${status}`);
    }
  }
  const depsHTML =
    deps.length > 0
      ? deps.map((d, i) => `<li>${escapeHTML(d)}</li>`).join("\n")
      : "<li>None identified.</li>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Handoff Evidence Report — ${escapeHTML(project.name || "Untitled")}</title>
  <style>
    :root {
      --supported: #16a34a;
      --attested: #ca8a04;
      --not-supported: #dc2626;
      --not-assessed: #6b7280;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      color: #1f2937;
      line-height: 1.6;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .subtitle { color: #6b7280; margin-bottom: 2rem; }
    .scope-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
      font-size: 0.9rem;
      color: #374151;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    th {
      background: #f3f4f6;
      text-align: left;
      padding: 0.75rem;
      border-bottom: 2px solid #d1d5db;
      font-size: 0.85rem;
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9rem;
      vertical-align: top;
    }
    .category-header td {
      font-weight: 700;
      background: #f9fafb;
      border-bottom: 2px solid #d1d5db;
      padding-top: 1rem;
    }
    .item-num { width: 40px; text-align: center; font-weight: 600; }
    .item-label { width: 250px; }
    .item-status { width: 150px; font-weight: 600; }
    .status-supported { color: var(--supported); }
    .status-attested { color: var(--attested); }
    .status-not-supported { color: var(--not-supported); }
    .status-not-assessed { color: var(--not-assessed); }
    .item-notes { font-size: 0.85rem; color: #4b5563; }
    .summary-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
    }
    .summary-box h3 { margin-top: 0; font-size: 1rem; }
    .report-incomplete {
      border: 1px solid #fde68a;
      background: #fffbeb;
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
      font-size: 0.9rem;
      color: #92400e;
    }
    .summary-counts {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .count-item { font-size: 0.9rem; }
    .count-item strong { font-size: 1.1rem; }
    .count-supported strong { color: var(--supported); }
    .count-attested strong { color: var(--attested); }
    .count-not-supported strong { color: var(--not-supported); }
    .count-not-assessed strong { color: var(--not-assessed); }
    .deps-section { margin: 1.5rem 0; }
    .deps-section h3 { font-size: 1rem; }
    .deps-section ul { padding-left: 1.5rem; }
    .limitation {
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
      font-size: 0.9rem;
    }
    .limitation h3 { margin-top: 0; font-size: 1rem; }
    .meta { font-size: 0.8rem; color: #9ca3af; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>Handoff Evidence Report</h1>
  <div class="subtitle">
    <strong>Project:</strong> ${escapeHTML(project.name || "N/A")}<br>
    <strong>Prepared by:</strong> Martua — human-reviewed submitted evidence<br>
    <strong>Evidence collected:</strong> ${escapeHTML(collectedAt)}
  </div>

  <div class="scope-box">
    <strong>Scope:</strong> This report reflects only the evidence supplied by the requester. It is not an independent security audit, code review, operational certification, or warranty of completeness. A SUPPORTED status means submitted evidence supports the stated condition — it does not mean the underlying action was independently executed unless explicitly stated.
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Status</th>
        <th>Evidence / Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="summary-box">
    <h3>Summary</h3>
    <p><strong>${assessed} of ${totalItems} items assessed</strong> — SUPPORTED: ${supportedCount} · ATTESTED: ${attestedCount} · NOT SUPPORTED: ${notSupportedCount} · NOT ASSESSED: ${notAssessedCount}</p>
    <div class="summary-counts">
      <div class="count-item count-supported"><strong>${supportedCount}</strong> supported by submitted evidence</div>
      <div class="count-item count-attested"><strong>${attestedCount}</strong> attested only</div>
      <div class="count-item count-not-supported"><strong>${notSupportedCount}</strong> not supported</div>
      <div class="count-item count-not-assessed"><strong>${notAssessedCount}</strong> not assessed</div>
    </div>
  </div>
${incompleteNotice}

  <div class="deps-section">
    <h3>Operational dependencies / gaps</h3>
    <ul>
      ${depsHTML}
    </ul>
  </div>

  <div class="limitation">
    <h3>Important limitation</h3>
    <p>This report documents and reviews submitted evidence. It does not independently execute
    deployments, rollbacks, restores, account transfers, production changes, or security testing.</p>
  </div>

  <div class="meta">
    Generated by Handoff Evidence Tool v1.0 · ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs();

  // Load evidence
  const evidencePath = resolve(args.evidence);
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  // Load statuses
  const statusesPath = resolve(args.statuses);
  const statusMap = JSON.parse(readFileSync(statusesPath, "utf8"));

  // Capture how many statuses were ACTUALLY set by a human BEFORE we default
  // absent items. This is the honest assessment count.
  const humanAssessed = humanAssessedCount(statusMap);

  // Validate statuses
  for (const item of CANONICAL_ITEMS) {
    const entry = statusMap[item.id];
    if (!entry) {
      console.warn(
        `  WARNING: No status assigned for "${item.id}" (${item.label}). Defaulting to NOT ASSESSED.`
      );
      statusMap[item.id] = {
        status: "NOT ASSESSED",
        notes: "No status assigned by reviewer.",
      };
    } else if (!VALID_STATUSES.includes(entry.status)) {
      console.error(
        `  ERROR: Invalid status "${entry.status}" for "${item.id}". Valid: ${VALID_STATUSES.join(", ")}`
      );
      process.exit(1);
    }
  }

  // Compute summary from actual data (NEVER manual input)
  const summary = computeSummary(statusMap);

  console.log("\n── Auto-Computed Summary (from status data) ──\n");
  console.log(`  SUPPORTED:       ${summary["SUPPORTED"]}`);
  console.log(`  ATTESTED:        ${summary["ATTESTED"]}`);
  console.log(`  NOT SUPPORTED:   ${summary["NOT SUPPORTED"]}`);
  console.log(`  NOT ASSESSED:    ${summary["NOT ASSESSED"]}`);
  console.log(`  ─────────────────`);
  console.log(
    `  TOTAL:           ${Object.values(summary).reduce((a, b) => a + b, 0)}`
  );
  console.log(
    `  HUMAN-ASSESSED:  ${humanAssessed} of ${CANONICAL_ITEMS.length}`
  );
  if (humanAssessed < CANONICAL_ITEMS.length) {
    console.log(
      `   ASSESSMENT INCOMPLETE: ${CANONICAL_ITEMS.length - humanAssessed} item(s) had no human-set status and defaulted to NOT ASSESSED.`
    );
  }
  console.log(
    "\n  Counts are derived from status data, not entered manually."
  );

  // Generate HTML
  const html = generateHTML(evidence, statusMap, summary, humanAssessed);
  const outputPath = resolve(args.output);
  writeFileSync(outputPath, html, "utf8");

  console.log(`\n  Report written to: ${outputPath}`);
  console.log("  Open in a browser to review, or convert to PDF via print.\n");
}

main();
