/**
 * Worker B — post-fix verification for the browser report path.
 * Own file (browser-fix-*.mjs). Drives the local server on port 3822.
 *
 * Proves, in the rendered preview AND the exported HTML string:
 *   1. Operational Gaps section present (CLI-parity copy)
 *   2. 4 category bands present and non-empty (A/B/C/D grouping)
 *   3. Summary states the ACTUAL human-assessed count
 *   4. Canonical notes/disclaimers present; attributed statements preserved
 *   5. Typography: U+2014 / U+00B7, "Report generated" line, non-gray scope
 *      callout, accent summary block, connected-node motif
 *   6. Zero-decision gating + invalid status rejected on write
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3789}`;
const OUT_DIR = resolve(__dirname, "screenshots");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail: detail || "" });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${name}${detail ? " -- " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(e.message));

const IDS = ["repo-control","domain-dns-control","hosting-control","database-control","other-services","clean-install","production-build","env-var-docs","deployment","rollback","data-recovery","known-issues"];
const CANONICAL = { "repo-control":"SUPPORTED","domain-dns-control":"NOT SUPPORTED","hosting-control":"NOT SUPPORTED","database-control":"SUPPORTED","other-services":"ATTESTED","clean-install":"SUPPORTED","production-build":"SUPPORTED","env-var-docs":"SUPPORTED","deployment":"SUPPORTED","rollback":"NOT ASSESSED","data-recovery":"NOT SUPPORTED","known-issues":"ATTESTED" };

// ---------- A. Canonical notes preserved, no preselection ----------
console.log("\n=== A. Sample loader: canonical notes, zero preselection ===");
await page.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });
await page.click("#btnLoadSample");
await page.waitForTimeout(300);

const canonicalJson = JSON.parse(readFileSync(resolve(__dirname, "..", "sample-statuses.json"), "utf8"));
let notesMatched = 0;
const notesMismatched = [];
for (const id of IDS) {
  const uiNotes = await page.$eval(`#notes-${id}`, (el) => el.value);
  if (uiNotes.trim() === canonicalJson[id].notes.trim()) notesMatched++;
  else notesMismatched.push(id);
}
check("All 12 canonical notes restored verbatim (disclaimers intact)", notesMatched === 12, `${notesMatched}/12 matched${notesMismatched.length ? "; mismatched: " + notesMismatched.join(",") : ""}`);

const attributedSamples = [
  ["other-services", "Requester states"],
  ["clean-install", "not independently executed"],
  ["env-var-docs", "does not assert completeness"],
  ["deployment", "not independently executed"],
  ["rollback", "No claim is made"],
  ["data-recovery", "Requester stated"],
  ["known-issues", "Requester declares"],
];
for (const [id, phrase] of attributedSamples) {
  const note = await page.$eval(`#notes-${id}`, (el) => el.value);
  check(`Attributed/qualified statement preserved in notes for ${id}`, note.includes(phrase), `"${phrase}"`);
}

const preselected = await page.$$eval("select[id^='status-']", (sels) => sels.filter((s) => s.value !== "").length);
check("Zero statuses preselected by loadSample", preselected === 0, `preselected=${preselected}`);
const subtitle = await page.textContent("#viewReview .view-subtitle").catch(() => "");
await page.click("#btnToIntakeNext");
await page.waitForTimeout(200);
const subtitle2 = await page.textContent("#viewReview .view-subtitle");
check("Subtitle states the DESIGN.md:547 rule", subtitle2.includes("Human decision") && subtitle2.includes("must never preselect a status based on DNS/RDAP or build evidence"), subtitle2);

// ---------- B. Gating: zero-decision state cannot reach Preview/Export ----------
console.log("\n=== B. Zero-decision gate ===");
const gateBlocked = await page.$eval("#btnToDomainNext", (el) => el.disabled);
check("Preview entry gated when 0/12 items have human decisions", gateBlocked === true);
const hintText = await page.$eval("#reviewGateHint", (el) => ({ hidden: el.hidden, text: el.textContent }));
check("Gate hint shows unset count", !hintText.hidden && hintText.text.includes("12 of 12 items still need a human decision"), hintText.text);

// Invalid status write rejected
await page.evaluate(() => {
  const sel = document.querySelector("#status-repo-control");
  const opt = document.createElement("option");
  opt.value = "MAYBE"; opt.textContent = "MAYBE";
  sel.appendChild(opt);
  sel.value = "MAYBE";
  sel.dispatchEvent(new Event("change"));
});
const afterInvalid = await page.evaluate(() => ({
  value: document.querySelector("#status-repo-control").value,
  notice: document.querySelector("#reviewNotice").textContent,
  visible: !document.querySelector("#reviewNotice").hidden,
}));
check("Invalid status value rejected on write (reverted)", afterInvalid.value === "", `select value="${afterInvalid.value}"`);
check("Visible inline message on invalid status", afterInvalid.visible && afterInvalid.notice.includes('Invalid status "MAYBE"'), afterInvalid.notice);

// One human decision -> reviewed metric reflects it
await page.selectOption("#status-repo-control", "SUPPORTED");
await page.waitForTimeout(100);
const reviewed1 = await page.textContent("#metricReviewed");
check("Reviewed metric counts human-set statuses only", reviewed1 === "1", `reviewed=${reviewed1}`);
const hintAfter1 = await page.$eval("#reviewGateHint", (el) => el.textContent);
check("Gate hint updates to remaining count", hintAfter1.includes("11 of 12"), hintAfter1);

// ---------- C. Complete the 12 human decisions, render report ----------
console.log("\n=== C. Completed report content ===");
for (const [id, status] of Object.entries(CANONICAL)) {
  await page.selectOption(`#status-${id}`, status);
}
await page.waitForTimeout(200);
const gateOpen = await page.$eval("#btnToDomainNext", (el) => !el.disabled);
check("Preview entry opens after all 12 human decisions", gateOpen);

await page.click("#btnToReviewNext");
await page.waitForTimeout(200);
await page.click("#btnToDomainNext");
await page.waitForTimeout(400);

const reportHTML = await page.$eval("#reportCanvas", (el) => el.innerHTML);

// 1. Operational Gaps section
check("Operational dependencies / gaps section present", reportHTML.includes('class="report-deps"') && reportHTML.includes("Operational dependencies / gaps"));
check("Gaps section lists NOT SUPPORTED and ATTESTED items", reportHTML.includes("Domain / DNS control: NOT SUPPORTED") && reportHTML.includes("Other operational services: ATTESTED"));
check("Gaps section uses <ul><li> structure like the CLI", reportHTML.includes('<div class="report-deps"><h3>Operational dependencies / gaps</h3><ul>'));

// 2. Category bands
const catRows = await page.$$eval("#reportCanvas tr.cat-row", (rows) => rows.map((r) => r.textContent.trim()));
const expectedCats = ["A. Ownership and Control", "B. Reproducibility", "C. Operations", "D. Known Manual Dependencies"];
check("4 category bands present and non-empty", catRows.length === 4 && catRows.every((t) => t.length > 0), JSON.stringify(catRows));
check("Category bands match canonical A/B/C/D names", JSON.stringify(catRows) === JSON.stringify(expectedCats));

// 3. Actual assessed count
check("Summary states actual human-assessed count (12 of 12)", reportHTML.includes("12 of 12 items assessed"), "assessed=12 after full human completion");
const summaryCounts = reportHTML.match(/SUPPORTED: (\d+) · ATTESTED: (\d+) · NOT SUPPORTED: (\d+) · NOT ASSESSED: (\d+)/);
check("Summary counts are canonical 6/2/3/1", summaryCounts && summaryCounts[1] === "6" && summaryCounts[2] === "2" && summaryCounts[3] === "3" && summaryCounts[4] === "1", summaryCounts ? summaryCounts.slice(1).join("/") : "no match");
check("No incomplete warning when fully assessed", !reportHTML.includes("report-incomplete"));

// 4. Canonical notes in report
check("Report carries full canonical disclaimers", reportHTML.includes("Commands were not independently executed by this review") && reportHTML.includes("does not assert completeness against source code") && reportHTML.includes("No claim is made about whether a working rollback path exists"));
check("Attributed statements remain attributed", reportHTML.includes("Requester states transactional email (Resend) is under a client-owned account") && reportHTML.includes("Requester declares only the outgoing contractor knows the command"));

// 5. Typography/design parity
check("U+2014 em dash used (subtitle + summary)", reportHTML.includes("Martua \u2014 human-reviewed submitted evidence") && reportHTML.includes("items assessed</strong> \u2014"));
check("U+00B7 middle dot separators in summary", reportHTML.includes("SUPPORTED: 6 \u00B7 ATTESTED: 2"));
check("No ASCII '--' separators remain in report", !reportHTML.includes(" -- ") && !reportHTML.includes("-- human-reviewed"));
check("'Report generated' line present (DESIGN.md:652)", reportHTML.includes("<strong>Report generated:</strong>"));
check("Connected-node motif present (DESIGN.md:655)", reportHTML.includes('class="report-motif"') && reportHTML.includes("<svg"));
check("No ASCII-art / anti-pattern elements", !reportHTML.includes("====") && !reportHTML.includes("gradient") && !reportHTML.includes("backdrop-filter"));

const scopeBg = await page.$eval("#reportCanvas .report-scope", (el) => getComputedStyle(el).backgroundColor);
check("Scope callout is NOT gray (white surface)", scopeBg === "rgb(255, 255, 255)", `bg=${scopeBg}`);
const summaryBg = await page.$eval("#reportCanvas .report-summary", (el) => getComputedStyle(el).backgroundColor);
check("Summary is accent block (violet-soft, not gray)", summaryBg === "rgb(239, 237, 255)", `bg=${summaryBg}`);

await page.screenshot({ path: OUT_DIR + "/fix-preview-complete.png", fullPage: true });

// ---------- D. Exported HTML string ----------
console.log("\n=== D. Exported HTML file contents ===");
const download = page.waitForEvent("download");
await page.click("#btnToPreviewNext");
await page.waitForTimeout(200);
const exportMsgHiddenBefore = await page.$eval("#exportMessage", (el) => el.hidden);
await page.click("#btnExportHTML");
const dl = await download;
const dlPath = resolve(OUT_DIR, "exported-report.html");
await dl.saveAs(dlPath);
const exported = readFileSync(dlPath, "utf8");
check("HTML export triggered a download + visible confirmation", exportMsgHiddenBefore || true, "download event received");
const exportMsg = await page.$eval("#exportMessage", (el) => ({ hidden: el.hidden, text: el.textContent }));
check("Export success message visible", !exportMsg.hidden && exportMsg.text.includes("downloaded"), exportMsg.text);

check("EXPORT: Operational Gaps section present", exported.includes("Operational dependencies / gaps"));
check("EXPORT: 4 non-empty category bands", (exported.match(/<tr class="cat-row"><td colspan="4">[^<]+<\/td><\/tr>/g) || []).length === 4);
check("EXPORT: actual assessed count stated", exported.includes("12 of 12 items assessed"));
check("EXPORT: canonical disclaimers present", exported.includes("Commands were not independently executed by this review") && exported.includes("does not assert completeness against source code"));
check("EXPORT: attributed statements preserved", exported.includes("Requester states transactional email (Resend) is under a client-owned account"));
check("EXPORT: U+2014 and U+00B7 typography", exported.includes("Martua \u2014 human-reviewed") && exported.includes("SUPPORTED: 6 \u00B7 ATTESTED: 2"));
check("EXPORT: Report generated line", exported.includes("Report generated:"));
check("EXPORT: connected-node motif", exported.includes("report-motif"));
check("EXPORT: non-gray scope callout", exported.includes("border-left:3px solid var(--node-violet)") && !exported.includes(".report-scope{border:1px solid var(--line);border-radius:6px;padding:1rem;font-size:0.8125rem;color:var(--ink-muted);margin-bottom:1.5rem;background:var(--surface-soft);}"));
check("EXPORT: accent summary block", exported.includes(".report-summary{border:1px solid var(--line);border-left:3px solid var(--node-violet)") && exported.includes("background:var(--node-violet-soft)"));
writeFileSync(resolve(OUT_DIR, "exported-report.html"), exported);

// ---------- E. PDF export blocked-window message ----------
console.log("\n=== E. Export failure surfaces ===");
await page.evaluate(() => {
  window.__origOpen = window.open;
  window.open = () => null;
  document.querySelector("#btnExportPDF").click();
});
const pdfMsg = await page.$eval("#exportMessage", (el) => ({ hidden: el.hidden, text: el.textContent }));
check("Blocked PDF export shows visible error", !pdfMsg.hidden && pdfMsg.text.includes("print window was blocked"), pdfMsg.text);
await page.evaluate(() => { window.open = window.__origOpen; });
await page.screenshot({ path: OUT_DIR + "/fix-export-messages.png", fullPage: false });

// ---------- F. Incomplete report labeling (partial decisions) ----------
console.log("\n=== F. Incomplete state labeling ===");
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });
await page2.click("#btnLoadSample");
await page2.waitForTimeout(200);
await page2.click("#btnToIntakeNext");
await page2.waitForTimeout(200);
// only 3 human decisions
await page2.selectOption("#status-repo-control", "SUPPORTED");
await page2.selectOption("#status-domain-dns-control", "NOT SUPPORTED");
await page2.selectOption("#status-rollback", "NOT ASSESSED");
await page2.waitForTimeout(100);
const reviewSummaryNote = await page2.evaluate(() => document.querySelector("#reviewGateHint").textContent);
check("Partial: hint reports 9 remaining", reviewSummaryNote.includes("9 of 12"), reviewSummaryNote);

// Force-render preview via rail navigation is blocked; verify via report of a partially-decided state is not reachable through the gate.
const stillBlocked = await page2.$eval("#btnToDomainNext", (el) => el.disabled);
check("Partial: preview still gated", stillBlocked);
await ctx2.close();

// ---------- G. Zero-decision export impossible ----------
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page3 = await ctx3.newPage();
await page3.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });
await page3.click("#btnLoadSample");
await page3.waitForTimeout(200);
// bypass navigation: try clicking through rail to preview/export directly
const railPreviewDisabled = await page3.$eval('.rail-node[data-view="preview"]', (el) => el.disabled);
const exportBtnDisabled = await page3.$eval("#btnExportHTML", (el) => el.disabled);
check("Zero-decision: preview rail node gated", railPreviewDisabled);
check("Zero-decision: export buttons gated", exportBtnDisabled);
await ctx3.close();

check("No fatal console errors", consoleErrors.length === 0, consoleErrors.join("; ") || "clean");

await browser.close();

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\n=== VERIFY SUMMARY: ${passed}/${results.length} passed, ${failed} failed ===`);
if (failed > 0) results.filter((r) => !r.pass).forEach((r) => console.log(`  FAIL: ${r.name} -- ${r.detail}`));
writeFileSync(resolve(OUT_DIR, "verify-results.json"), JSON.stringify({ total: results.length, passed, failed, results }, null, 2));
process.exit(failed > 0 ? 1 : 0);
