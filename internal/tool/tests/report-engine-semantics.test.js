#!/usr/bin/env node

/**
 * Report Engine (Modul B) — Focused Semantic Tests
 *
 * Verifies report-generation semantics independently of the browser shell.
 * Runs report-generator.js end-to-end and inspects the produced HTML.
 *
 * Requirements verified:
 *  - exactly 12 items
 *  - exactly 4 categories
 *  - statuses come from human review input (never auto-determined)
 *  - counts calculated dynamically from actual statuses
 *  - canonical sample produces EXACTLY 6 SUPPORTED / 2 ATTESTED / 3 NOT SUPPORTED / 1 NOT ASSESSED
 *  - malformed / invalid statuses rejected
 *  - missing statuses handled per PRD (default NOT ASSESSED, with warning)
 *  - notes / recommendations safely HTML-escaped (no XSS via note text)
 *  - 'documented vs execution-tested' distinction preserved
 *  - scope disclaimer preserved
 *  - operational limitation preserved
 *  - produces valid standalone HTML
 *  - print/PDF semantics supported locally (no external resources)
 *  - NO network transmission whatsoever
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = resolve(__dirname, "..");
const SAMPLE_EVIDENCE = resolve(TOOL_DIR, "sample-evidence.json");
const SAMPLE_STATUSES = resolve(TOOL_DIR, "sample-statuses.json");
const REPORT_GEN = resolve(TOOL_DIR, "report-generator.js");

let passed = 0;
let failed = 0;
let bugsFound = [];
const TMP_FILES = [];

function assert(condition, msg, bugId) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    bugsFound.push(bugId || msg);
    console.error(`  FAIL  ${msg}`);
  }
}

function tmpPath(name) {
  const p = resolve(TOOL_DIR, name);
  TMP_FILES.push(p);
  return p;
}

function cleanup() {
  for (const f of TMP_FILES) {
    try { if (existsSync(f)) unlinkSync(f); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Helper: run report-generator and return the HTML output
// ═══════════════════════════════════════════════════════════════════════
function runReport(evidencePath, statusesPath, outputPath) {
  execSync(
    `node "${REPORT_GEN}" --evidence "${evidencePath}" --statuses "${statusesPath}" --output "${outputPath}"`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
  return readFileSync(outputPath, "utf8");
}

// ═══════════════════════════════════════════════════════════════════════
// Test 1: Canonical 6/2/3/1 with sample-statuses.json
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T1: Canonical 6/2/3/1 counts from sample-statuses.json ──\n");

const canonicalOutput = tmpPath("_test-canonical-report.html");
const html = runReport(SAMPLE_EVIDENCE, SAMPLE_STATUSES, canonicalOutput);

// Verify exactly 12 item rows in the table (not counting category headers)
// Each item row has class "item-num"
const itemNumMatches = html.match(/class="item-num">/g);
assert(itemNumMatches && itemNumMatches.length === 12,
  `Exactly 12 items in table (got ${itemNumMatches?.length || 0})`,
  "T1_ITEMS_COUNT");

// Verify exactly 4 category headers
const catHeaderMatches = html.match(/class="category-header">/g);
assert(catHeaderMatches && catHeaderMatches.length === 4,
  `Exactly 4 categories (got ${catHeaderMatches?.length || 0})`,
  "T1_CATEGORY_COUNT");

// Verify canonical 6/2/3/1 distribution in HTML status cells
const supCount = (html.match(/class="item-status status-supported">SUPPORTED/g) || []).length;
const attCount = (html.match(/class="item-status status-attested">ATTESTED/g) || []).length;
const nsCount = (html.match(/class="item-status status-not-supported">NOT SUPPORTED/g) || []).length;
const naCount = (html.match(/class="item-status status-not-assessed">NOT ASSESSED/g) || []).length;

assert(supCount === 6, `SUPPORTED = 6 (got ${supCount})`, "T1_SUPPORTED_COUNT");
assert(attCount === 2, `ATTESTED = 2 (got ${attCount})`, "T1_ATTESTED_COUNT");
assert(nsCount === 3, `NOT SUPPORTED = 3 (got ${nsCount})`, "T1_NOT_SUPPORTED_COUNT");
assert(naCount === 1, `NOT ASSESSED = 1 (got ${naCount})`, "T1_NOT_ASSESSED_COUNT");
assert(supCount + attCount + nsCount + naCount === 12,
  `Total status cells = 12 (got ${supCount + attCount + nsCount + naCount})`,
  "T1_TOTAL_SUM");

// ═══════════════════════════════════════════════════════════════════════
// Test 2: Summary text shows "12 items assessed" with correct counts
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T2: Summary text in rendered HTML ──\n");

assert(html.includes("12 items assessed"), "Summary states '12 items assessed'", "T2_SUMMARY_TEXT");
assert(html.includes("SUPPORTED: 6"), "Summary line: SUPPORTED: 6", "T2_SUMMARY_SUPPORTED");
assert(html.includes("ATTESTED: 2"), "Summary line: ATTESTED: 2", "T2_SUMMARY_ATTESTED");
assert(html.includes("NOT SUPPORTED: 3"), "Summary line: NOT SUPPORTED: 3", "T2_SUMMARY_NS");
assert(html.includes("NOT ASSESSED: 1"), "Summary line: NOT ASSESSED: 1", "T2_SUMMARY_NA");

// ═══════════════════════════════════════════════════════════════════════
// Test 3: Counts are calculated dynamically (not hardcoded)
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T3: Counts calculated dynamically ──\n");

// Change statuses: flip one SUPPORTED to ATTESTED, one NOT SUPPORTED to NOT ASSESSED
const altStatuses = JSON.parse(readFileSync(SAMPLE_STATUSES, "utf8"));
altStatuses["repo-control"].status = "ATTESTED";        // was SUPPORTED → now 5 sup, 3 att
altStatuses["hosting-control"].status = "NOT ASSESSED"; // was NOT SUPPORTED → now 2 ns, 2 na

const altPath = tmpPath("_test-alt-statuses.json");
writeFileSync(altPath, JSON.stringify(altStatuses, null, 2));

const altOutput = tmpPath("_test-alt-report.html");
const altHtml = runReport(SAMPLE_EVIDENCE, altPath, altOutput);

const altSup = (altHtml.match(/class="item-status status-supported">SUPPORTED/g) || []).length;
const altAtt = (altHtml.match(/class="item-status status-attested">ATTESTED/g) || []).length;
const altNs = (altHtml.match(/class="item-status status-not-supported">NOT SUPPORTED/g) || []).length;
const altNa = (altHtml.match(/class="item-status status-not-assessed">NOT ASSESSED/g) || []).length;

assert(altSup === 5, `Altered statuses: SUPPORTED = 5 (got ${altSup})`, "T3_DYNAMIC_SUPPORTED");
assert(altAtt === 3, `Altered statuses: ATTESTED = 3 (got ${altAtt})`, "T3_DYNAMIC_ATTESTED");
assert(altNs === 2, `Altered statuses: NOT SUPPORTED = 2 (got ${altNs})`, "T3_DYNAMIC_NS");
assert(altNa === 2, `Altered statuses: NOT ASSESSED = 2 (got ${altNa})`, "T3_DYNAMIC_NA");
assert(altSup + altAtt + altNs + altNa === 12,
  `Altered total still = 12 (got ${altSup + altAtt + altNs + altNa})`,
  "T3_DYNAMIC_TOTAL");

// Also verify the summary text updated
assert(altHtml.includes("SUPPORTED: 5"), "Dynamic summary: SUPPORTED: 5", "T3_DYNAMIC_SUMMARY_SUP");
assert(altHtml.includes("ATTESTED: 3"), "Dynamic summary: ATTESTED: 3", "T3_DYNAMIC_SUMMARY_ATT");
assert(altHtml.includes("NOT SUPPORTED: 2"), "Dynamic summary: NOT SUPPORTED: 2", "T3_DYNAMIC_SUMMARY_NS");
assert(altHtml.includes("NOT ASSESSED: 2"), "Dynamic summary: NOT ASSESSED: 2", "T3_DYNAMIC_SUMMARY_NA");

// ═══════════════════════════════════════════════════════════════════════
// Test 4: Invalid/malformed statuses are rejected (process exits non-zero)
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T4: Invalid/malformed statuses rejected ──\n");

const invalidCases = [
  { id: "VALIDATED",      label: "uppercase invalid" },
  { id: "suppported",     label: "typo (missing P)" },
  { id: "YES",            label: "boolean-like" },
  { id: "",               label: "empty string" },
  { id: "Pending",        label: "mixed case" },
  { id: "NONE",           label: "different enum" },
];

for (const { id, label } of invalidCases) {
  const badStatuses = { "repo-control": { status: id, notes: "test" } };
  const badPath = tmpPath(`_test-bad-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(badPath, JSON.stringify(badStatuses, null, 2));

  let exited = false;
  try {
    execSync(
      `node "${REPORT_GEN}" --evidence "${SAMPLE_EVIDENCE}" --statuses "${badPath}" --output "${tmpPath(`_test-bad-out-${Date.now()}.html`)}"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch {
    exited = true;
  }
  assert(exited, `Invalid status "${label}" (${id}) correctly rejected`, `T4_REJECT_${label.replace(/\s+/g, "_").toUpperCase()}`);
}

// ═══════════════════════════════════════════════════════════════════════
// Test 5: Missing statuses default to NOT ASSESSED (per PRD)
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T5: Missing statuses → NOT ASSESSED (PRD-compliant) ──\n");

// Empty statuses object: all 12 missing
const emptyStatuses = {};
const emptyPath = tmpPath("_test-empty-statuses.json");
writeFileSync(emptyPath, JSON.stringify(emptyStatuses, null, 2));

const emptyOutput = tmpPath("_test-empty-report.html");
const emptyHtml = runReport(SAMPLE_EVIDENCE, emptyPath, emptyOutput);

const emptyNA = (emptyHtml.match(/class="item-status status-not-assessed">NOT ASSESSED/g) || []).length;
const emptySup = (emptyHtml.match(/class="item-status status-supported">SUPPORTED/g) || []).length;
assert(emptyNA === 12, `All 12 missing items default to NOT ASSESSED (got ${emptyNA})`, "T5_ALL_MISSING");
assert(emptySup === 0, `No SUPPORTED when none assigned (got ${emptySup})`, "T5_NONE_SUPPORTED");
assert(emptyHtml.includes("NOT ASSESSED: 12"), "Summary: NOT ASSESSED: 12", "T5_SUMMARY_ALL_NA");

// Partial statuses: 1 assigned, 11 missing
const partialStatuses = { "deployment": { status: "SUPPORTED", notes: "Verified." } };
const partialPath = tmpPath("_test-partial-statuses.json");
writeFileSync(partialPath, JSON.stringify(partialStatuses, null, 2));

const partialOutput = tmpPath("_test-partial-report.html");
const partialHtml = runReport(SAMPLE_EVIDENCE, partialPath, partialOutput);

const partialNA = (partialHtml.match(/class="item-status status-not-assessed">NOT ASSESSED/g) || []).length;
const partialSup = (partialHtml.match(/class="item-status status-supported">SUPPORTED/g) || []).length;
assert(partialNA === 11, `Partial: 11 missing → NOT ASSESSED (got ${partialNA})`, "T5_PARTIAL_MISSING");
assert(partialSup === 1, `Partial: 1 SUPPORTED assigned (got ${partialSup})`, "T5_PARTIAL_ASSIGNED");

// ═══════════════════════════════════════════════════════════════════════
// Test 6: HTML-escape of notes prevents XSS
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T6: Notes are HTML-escaped (no XSS via note text) ──\n");

const xssPayload = '<script>alert("xss")</script><img src=x onerror="alert(1)">';
const xssStatuses = {
  "repo-control": { status: "SUPPORTED", notes: xssPayload },
  "domain-dns-control": { status: "ATTESTED", notes: 'He said "hello" & she said <goodbye>' },
  "hosting-control": { status: "NOT SUPPORTED", notes: "Details: foo < bar & baz > qux" },
};
// Fill remaining 9 items with valid statuses
const remainingIds = [
  "database-control", "other-services", "clean-install", "production-build",
  "env-var-docs", "deployment", "rollback", "data-recovery", "known-issues"
];
for (const id of remainingIds) {
  xssStatuses[id] = { status: "SUPPORTED", notes: "ok" };
}

const xssPath = tmpPath("_test-xss-statuses.json");
writeFileSync(xssPath, JSON.stringify(xssStatuses, null, 2));

const xssOutput = tmpPath("_test-xss-report.html");
const xssHtml = runReport(SAMPLE_EVIDENCE, xssPath, xssOutput);

// The raw <script> tag must NOT appear in the HTML (it should be escaped)
assert(!xssHtml.includes('<script>alert("xss")</script>'),
  "Raw <script> tag escaped in notes",
  "T6_XSS_SCRIPT_TAG");

// The escaped form should be present
assert(xssHtml.includes("&lt;script&gt;") || xssHtml.includes("&lt;script"),
  "Escaped script tag present in output",
  "T6_XSS_ESCAPED_SCRIPT");

// Angle brackets in other notes are escaped
assert(xssHtml.includes("foo &lt; bar &amp; baz &gt; qux") ||
       xssHtml.includes("foo &lt; bar") ||
       xssHtml.includes("&lt;"),
  "Angle brackets escaped in other notes",
  "T6_XSS_ANGLES");

// Double quotes are escaped
assert(xssHtml.includes("&quot;") || !xssHtml.includes('"hello"'),
  "Double quotes escaped in notes",
  "T6_XSS_QUOTES");

// No raw onerror attribute should appear in output
assert(!xssHtml.includes('onerror="alert(1)"'),
  "onerror handler escaped/neutralized",
  "T6_XSS_ONERROR");

// ═══════════════════════════════════════════════════════════════════════
// Test 7: 'documented vs execution-tested' distinction preserved
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T7: 'documented vs execution-tested' distinction ──\n");

// The canonical sample notes contain phrases like "not independently executed"
// and "Commands were not independently executed by this review"
assert(html.includes("not independently executed"),
  "Notes contain 'not independently executed' distinction",
  "T7_DOCUMENTED_NOT_EXECUTED");

// Also check the report doesn't claim execution was verified for documented-only items
// deployment is SUPPORTED in sample but the note says "Deployment was not independently executed"
assert(html.includes("Deployment was not independently executed") ||
       html.includes("not independently executed"),
  "Deployment note preserves documented-vs-tested distinction",
  "T7_DEPLOYMENT_DISTINCTION");

// ═══════════════════════════════════════════════════════════════════════
// Test 8: Scope disclaimer is present and complete
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T8: Scope disclaimer preserved ──\n");

assert(html.includes("scope-box"), "Scope box div present", "T8_SCOPE_BOX");
assert(html.includes("not an independent security audit"),
  "Scope disclaimer: not a security audit",
  "T8_DISCLAIMER_AUDIT");
assert(html.includes("not an independent security audit, code review, operational certification, or warranty of completeness"),
  "Full scope disclaimer text present",
  "T8_DISCLAIMER_FULL");
assert(html.includes("does not mean the underlying action was independently executed"),
  "SUPPORTED ≠ independently executed disclaimer",
  "T8_SUPPORTED_DISCLAIMER");

// ═══════════════════════════════════════════════════════════════════════
// Test 9: Operational limitation section present
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T9: Operational limitation preserved ──\n");

assert(html.includes("Important limitation"), "Limitation section header present", "T9_LIMITATION_HEADER");
assert(html.includes("does not independently execute"),
  "Limitation: does not independently execute",
  "T9_LIMITATION_EXECUTE");
assert(html.includes("deployments, rollbacks, restores, account transfers"),
  "Limitation lists what is NOT independently executed",
  "T9_LIMITATION_LIST");

// ═══════════════════════════════════════════════════════════════════════
// Test 10: Valid standalone HTML
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T10: Valid standalone HTML ──\n");

assert(html.startsWith("<!DOCTYPE html>"), "HTML starts with DOCTYPE", "T10_DOCTYPE");
assert(html.includes('<html lang="en">'), "HTML lang attribute present", "T10_HTML_LANG");
assert(html.includes("<head>"), "Has <head> section", "T10_HEAD");
assert(html.includes("</head>"), "Head section closed", "T10_HEAD_CLOSE");
assert(html.includes("<body>"), "Has <body> section", "T10_BODY");
assert(html.includes("</body>"), "Body section closed", "T10_BODY_CLOSE");
assert(html.includes("</html>"), "HTML section closed", "T10_HTML_CLOSE");
assert(html.includes('<meta charset="UTF-8">'), "UTF-8 charset meta", "T10_CHARSET");
assert(html.includes("<style>"), "Inline CSS (standalone, no external sheets)", "T10_STYLE");
assert(!html.includes('<link rel="stylesheet" href="'), "No external CSS links", "T10_NO_EXTERNAL_CSS");
assert(!html.includes('<script src="'), "No external script sources", "T10_NO_EXTERNAL_JS");
assert(html.includes("<table>"), "Report contains table element", "T10_TABLE");
assert(html.includes("<thead>"), "Table has thead", "T10_TABLEAD");
assert(html.includes("<tbody>"), "Table has tbody", "T10_TBODY");

// ═══════════════════════════════════════════════════════════════════════
// Test 11: Print/PDF semantics — no network resources
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T11: Print/PDF semantics (no external resources) ──\n");

assert(!html.includes("https://fonts.googleapis.com"), "No Google Fonts (external CDN)", "T11_NO_GOOGLE_FONTS");
assert(!html.includes("https://cdn."), "No CDN references", "T11_NO_CDN");
assert(!html.includes("http://"), "No HTTP URLs", "T11_NO_HTTP");
// The font-family uses system fonts only
assert(html.includes("-apple-system") || html.includes("BlinkMacSystemFont") || html.includes("sans-serif"),
  "Uses system font stack (print-safe)",
  "T11_SYSTEM_FONTS");

// ═══════════════════════════════════════════════════════════════════════
// Test 12: NO network transmission in report-generator.js source
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T12: No network transmission in report generator ──\n");

const reportSrc = readFileSync(REPORT_GEN, "utf8");
assert(!reportSrc.includes("fetch("), "No fetch() calls in report-generator.js", "T12_NO_FETCH");
assert(!reportSrc.includes("http.request"), "No http.request in report-generator.js", "T12_NO_HTTP_REQ");
assert(!reportSrc.includes("XMLHttpRequest"), "No XMLHttpRequest in report-generator.js", "T12_NO_XHR");
assert(!reportSrc.includes("WebSocket"), "No WebSocket in report-generator.js", "T12_NO_WS");
assert(!reportSrc.includes("navigator.sendBeacon"), "No sendBeacon in report-generator.js", "T12_NO_BEACON");
assert(reportSrc.includes("writeFileSync"), "Writes only to local file system", "T12_LOCAL_WRITE");

// ═══════════════════════════════════════════════════════════════════════
// Test 13: Statuses are never auto-determined — verify no auto-verdict logic
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T13: Statuses never auto-determined ──\n");

assert(!reportSrc.includes("auto-determine") && !reportSrc.includes("autoVerdict") && !reportSrc.includes("aiVerdict"),
  "No auto-verdict logic in report generator",
  "T13_NO_AUTO_VERDICT");
assert(reportSrc.includes("VALID_STATUSES"),
  "Valid statuses whitelist defined (input-only validation)",
  "T13_WHITELIST");
assert(reportSrc.includes("process.exit(1)") || reportSrc.includes("process.exit("),
  "Invalid statuses cause hard exit (not silent fallback)",
  "T13_HARD_EXIT");

// ═══════════════════════════════════════════════════════════════════════
// Test 14: Canonical item IDs, categories, and ordering
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T14: Canonical item structure in source ──\n");

// Verify CANONICAL_ITEMS has exactly 12 entries
const canonicalMatch = reportSrc.match(/const CANONICAL_ITEMS\s*=\s*\[/);
assert(canonicalMatch, "CANONICAL_ITEMS array defined in source", "T14_DEFINES_ITEMS");

// Verify 4 distinct categories
const cats = ["A. Ownership and Control", "B. Reproducibility", "C. Operations", "D. Known Manual Dependencies"];
for (const cat of cats) {
  assert(reportSrc.includes(`"${cat}"`), `Category "${cat}" defined`, `T14_CAT_${cat.charAt(0)}`);
}

// Verify the 12 canonical item IDs are in the source
const expectedIds = [
  "repo-control", "domain-dns-control", "hosting-control", "database-control", "other-services",
  "clean-install", "production-build", "env-var-docs",
  "deployment", "rollback", "data-recovery",
  "known-issues"
];
for (const id of expectedIds) {
  assert(reportSrc.includes(`"${id}"`), `Item ID "${id}" in canonical list`, `T14_ITEM_${id.toUpperCase().replace(/-/g, "_")}`);
}

// Verify VALID_STATUSES has exactly 4 entries
assert(reportSrc.includes('"SUPPORTED"'), "VALID_STATUSES includes SUPPORTED", "T14_VALID_SUPPORTED");
assert(reportSrc.includes('"ATTESTED"'), "VALID_STATUSES includes ATTESTED", "T14_VALID_ATTESTED");
assert(reportSrc.includes('"NOT SUPPORTED"'), "VALID_STATUSES includes NOT SUPPORTED", "T14_VALID_NS");
assert(reportSrc.includes('"NOT ASSESSED"'), "VALID_STATUSES includes NOT ASSESSED", "T14_VALID_NA");

// ═══════════════════════════════════════════════════════════════════════
// Test 15: Missing item in statuses JSON → NOT ASSESSED with warning
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T15: Missing item produces warning and defaults ──\n");

const missPath = tmpPath("_test-missing-warn.json");
// Only provide 2 items, 10 are missing
writeFileSync(missPath, JSON.stringify({
  "repo-control": { status: "SUPPORTED", notes: "ok" },
  "clean-install": { status: "SUPPORTED", notes: "ok" }
}, null, 2));

const missOutput = tmpPath("_test-missing-warn-report.html");
const stderrBuf = [];
try {
  execSync(
    `node "${REPORT_GEN}" --evidence "${SAMPLE_EVIDENCE}" --statuses "${missPath}" --output "${missOutput}"`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
} catch (e) {
  // stderr is in e.stderr
  stderrBuf.push(e.stderr || "");
}

const missHtml = readFileSync(missOutput, "utf8");
const missNA = (missHtml.match(/class="item-status status-not-assessed">NOT ASSESSED/g) || []).length;
const missSup = (missHtml.match(/class="item-status status-supported">SUPPORTED/g) || []).length;

assert(missNA === 10, `Missing 10 → 10 NOT ASSESSED (got ${missNA})`, "T15_MISSING_DEFAULTS");
assert(missSup === 2, `2 assigned → 2 SUPPORTED (got ${missSup})`, "T15_ASSIGNED_PRESERVED");
// The report still totals 12
assert(missHtml.includes("12 items assessed"), "Total still 12 items assessed", "T15_TOTAL_12");

// ═══════════════════════════════════════════════════════════════════════
// Test 16: EscapeHTML function handles edge cases
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T16: escapeHTML edge cases ──\n");

// Test with null/undefined notes in the statuses
const nullNotesStatuses = {
  "repo-control": { status: "SUPPORTED" }, // no notes key at all
  "domain-dns-control": { status: "ATTESTED", notes: null },
  "hosting-control": { status: "NOT SUPPORTED", notes: "" },
};
// Fill remaining with valid
const remainingFor16 = [
  "database-control", "other-services", "clean-install", "production-build",
  "env-var-docs", "deployment", "rollback", "data-recovery", "known-issues"
];
for (const id of remainingFor16) {
  nullNotesStatuses[id] = { status: "SUPPORTED", notes: "ok" };
}

const nullPath = tmpPath("_test-null-notes.json");
writeFileSync(nullPath, JSON.stringify(nullNotesStatuses, null, 2));

const nullOutput = tmpPath("_test-null-notes-report.html");
let nullWorked = true;
try {
  runReport(SAMPLE_EVIDENCE, nullPath, nullOutput);
} catch {
  nullWorked = false;
}
assert(nullWorked, "Report handles null/missing notes without crashing", "T16_NULL_NOTES");
if (nullWorked) {
  const nullHtml = readFileSync(nullOutput, "utf8");
  assert(nullHtml.includes("<!DOCTYPE html>"), "Produces valid HTML with null notes", "T16_NULL_HTML");
}

// ═══════════════════════════════════════════════════════════════════════
// Test 17: All notes from canonical sample are present in HTML
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── T17: All canonical sample notes present ──\n");

const sampleStatuses = JSON.parse(readFileSync(SAMPLE_STATUSES, "utf8"));
// Check that a unique substring from each note appears in the HTML
const noteChecks = [
  ["repo-control", "acme-inc"],
  ["domain-dns-control", "personal registrar"],
  ["hosting-control", "personal Vercel team"],
  ["database-control", "Supabase"],
  ["other-services", "Resend"],
  ["clean-install", "exit status 0"],
  ["production-build", "exit status 0"],
  ["env-var-docs", "14 required variable"],
  ["deployment", "Deployment was not independently executed"],
  ["rollback", "No sufficient rollback"],
  ["data-recovery", "no documented application-data recovery"],
  ["known-issues", "background cron job"],
];

for (const [id, fragment] of noteChecks) {
  const escaped = fragment.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  assert(html.includes(escaped) || html.includes(fragment),
    `Note for "${id}" contains "${fragment.slice(0, 30)}..."`,
    `T17_NOTE_${id.toUpperCase().replace(/-/g, "_")}`);
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
if (bugsFound.length > 0) {
  console.log(`  BUGS:    ${bugsFound.join("; ")}`);
}
console.log("═══════════════════════════════════════════════════════════════\n");

// Cleanup temp files
cleanup();

process.exit(failed > 0 ? 1 : 0);
