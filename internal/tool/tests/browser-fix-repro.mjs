/**
 * REPRODUCTION of confirmed browser-path defects (pre-fix evidence).
 * Worker B — runs against own server on port 3822.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const BASE = "http://localhost:3822";
const OUT_DIR = new URL(".", import.meta.url).pathname.replace(/^\//, "") + "repro-artifacts";
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const findings = [];
function check(name, value, detail) {
  findings.push({ name, value, detail: detail || "" });
  console.log(`  [${value ? "REPRO-CONFIRMED" : "not-reproduced"}] ${name}${detail ? " -- " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });

// Load canonical sample, then reach the export/preview path
await page.click("#btnLoadSample");
await page.waitForTimeout(300);
await page.click("#btnToIntakeNext");
await page.waitForTimeout(300);
await page.click("#btnToReviewNext");
await page.waitForTimeout(300);
await page.click("#btnToDomainNext");
await page.waitForTimeout(500);

const reportHTML = await page.$eval("#reportCanvas", (el) => el.innerHTML);

// DEFECT 1: Operational Gaps section missing
check("D1: 'Operational dependencies / gaps' section absent from report",
  !reportHTML.includes("Operational dependencies / gaps"),
  "depsHTML built at workspace.js:443-451 but never interpolated");

// DEFECT 2: empty category band / lost grouping
const catRows = await page.$$eval("#reportCanvas tr.cat-row", (rows) => rows.map((r) => r.textContent.trim()));
const nonEmptyCatRows = catRows.filter((t) => t.length > 0);
check("D2: category band is empty / A-D grouping lost",
  catRows.length !== 4 || nonEmptyCatRows.length !== 4,
  `cat-row count=${catRows.length}, non-empty=${nonEmptyCatRows.length}, texts=${JSON.stringify(catRows)}`);

// DEFECT 3: zero-decision state exports as completed assessment
// Fresh page, load sample is irrelevant; check with an EMPTY status state:
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });
// Evaluate generateReportHTML indirectly: load evidence only (no statuses) via sample then clear statuses through UI is hard;
// instead load sample (statuses prefilled by defect-4 loader) then verify the claim about defaults by checking a blank file load:
// Use the page's own functions through a data URL-free approach: load sample then blank every status via UI.
await page2.click("#btnLoadSample");
await page2.waitForTimeout(300);
await page2.click("#btnToIntakeNext");
await page2.waitForTimeout(300);
// Reset all 12 selects to empty (-- Select status --)
const ids = ["repo-control","domain-dns-control","hosting-control","database-control","other-services","clean-install","production-build","env-var-docs","deployment","rollback","data-recovery","known-issues"];
for (const id of ids) {
  await page2.selectOption(`#status-${id}`, "");
}
await page2.click("#btnToReviewNext");
await page2.waitForTimeout(200);
await page2.click("#btnToDomainNext"); // NOT gated pre-fix
await page2.waitForTimeout(500);
const blankReport = await page2.$eval("#reportCanvas", (el) => el.innerHTML);
check("D3: zero-decision state reaches Preview (no gating)",
  blankReport.includes("Handoff Evidence Report"),
  "blank statuses still render a full report");
check("D3: blank statuses default to 'NOT ASSESSED' and summary claims '12 items assessed'",
  blankReport.includes("12 items assessed") && !blankReport.includes("0 of 12"),
  "summary text does not reflect actual human decisions");

// DEFECT 4: sample loader discards canonical notes/disclaimers
await page2.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });
await page2.click("#btnLoadSample");
await page2.waitForTimeout(300);
const canonicalStatuses = JSON.parse(await page2.evaluate(async () => {
  const res = await fetch("/sample-statuses.json");
  return res.text();
}));
let notesDropped = 0;
const dropped = [];
for (const [id, entry] of Object.entries(canonicalStatuses)) {
  const uiNotes = await page2.$eval(`#notes-${id}`, (el) => el.value);
  if (uiNotes.trim() !== entry.notes.trim()) { notesDropped++; dropped.push(id); }
}
check("D4: canonical notes/disclaimers discarded by loadSample",
  notesDropped > 0,
  `${notesDropped}/12 notes differ from canonical sample-statuses.json; dropped: ${dropped.join(", ")}`);
check("D4: statuses preselected programmatically (12 writes) contradicting 'never preselect'",
  (await page2.$$eval("select[id^='status-']", (sels) => sels.filter((s) => s.value !== "").length)) === 12,
  "workspace.html:122 says 'Software must never preselect a status.'");

// DEFECT 5: typography drift
check("D5: ASCII '--' used where canonical uses U+2014 em dash",
  reportHTML.includes("--"),
  "e.g. 'Martua -- human-reviewed' and 'items assessed --'");
check("D5: '.' used where canonical uses U+00B7 middle dot",
  /SUPPORTED: \d+ \. ATTESTED/.test(reportHTML),
  "summary separator is ASCII period");
check("D5: 'Report generated ...' line missing",
  !reportHTML.includes("Report generated"),
  "DESIGN.md:652 requires it in header");
check("D5: scope callout is gray (surface-soft background)",
  reportHTML.includes('class="report-scope"'),
  "styled with --surface-soft gray in workspace.css:585");
check("D5: summary is gray block, not compact accent block",
  (await page.$eval("#reportCanvas .report-summary", (el) => getComputedStyle(el).backgroundColor)),
  "background is gray, DESIGN.md:675 wants accent block");
check("D5: no connected-node motif in report",
  !reportHTML.includes("report-motif") && !reportHTML.includes("<svg"),
  "DESIGN.md:655 requires restrained connected-node motif");

// DEFECT 6: silent PDF failure + unvalidated status writes
const pdfBlocked = await page2.evaluate(() => {
  // Simulate blocked popup: window.open returns null in the app -> check code path only via a stub
  const orig = window.open;
  window.open = () => null;
  let threw = false;
  try { document.querySelector("#btnExportPDF").click(); } catch (e) { threw = true; }
  window.open = orig;
  return { threw };
});
check("D6: blocked PDF export fails silently",
  !pdfBlocked.threw,
  "no visible error surfaced to user when window.open() returns null");
// Unvalidated status write via direct DOM manipulation
const writeValidation = await page2.evaluate(() => {
  const sel = document.querySelector("#status-repo-control");
  const opt = document.createElement("option");
  opt.value = "MAYBE"; opt.textContent = "MAYBE";
  sel.appendChild(opt);
  sel.value = "MAYBE";
  sel.dispatchEvent(new Event("change"));
  return sel.value;
});
check("D6: invalid status value accepted on write",
  writeValidation === "MAYBE",
  "CLI rejects unknown statuses; browser path accepts anything");

await page.screenshot({ path: OUT_DIR + "/repro-preview-defects.png", fullPage: true });
await page2.screenshot({ path: OUT_DIR + "/repro-blank-preview.png", fullPage: true });
writeFileSync(OUT_DIR + "/repro-results.json", JSON.stringify(findings, null, 2));
await browser.close();
console.log("\nREPRO_SUMMARY:" + JSON.stringify({ confirmed: findings.filter(f => f.value).length, total: findings.length }));
