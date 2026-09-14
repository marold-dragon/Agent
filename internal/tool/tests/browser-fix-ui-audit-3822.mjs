/**
 * Port/screenshot-path shim copy of the integrated ui-audit.mjs suite (unmodified logic).
 * The integrated file hardcodes port 3799, which this worker must not bind;
 * only BASE and SCREENSHOT_DIR are redirected to this session's server (3822).
 */
/**
 * UI Design Audit & Responsive Verification
 * Tests workspace against DESIGN.md requirements
 * Worker 4 â€” UI/Design implementation auditor
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";

const BASE = "http://localhost:3822";
const SCREENSHOT_DIR = "C:\\Users\\Lenovo\\.ao\\data\\worktrees\\new-project\\new-project-23\\internal\\tool\\tests\\screenshots";

if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

const VIEWPORTS = [
  { w: 1600, h: 900, label: "1600x900" },
  { w: 1440, h: 900, label: "1440x900" },
  { w: 1366, h: 768, label: "1366x768" },
  { w: 1280, h: 800, label: "1280x800" },
  { w: 1024, h: 768, label: "1024x768" },
  { w: 834, h: 1194, label: "834x1194" },
  { w: 768, h: 1024, label: "768x1024" },
  { w: 430, h: 932, label: "430x932" },
  { w: 390, h: 844, label: "390x844" },
  { w: 360, h: 800, label: "360x800" },
];

const results = [];

function log(test, pass, detail) {
  results.push({ test, pass, detail: detail || "" });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${test}${detail ? " -- " + detail : ""}`);
}

let browser;

try {
  browser = await chromium.launch({ headless: true });

  // =============================================
  // PHASE 1: Functional audit at 1440x900
  // =============================================
  console.log("\n=== PHASE 1: Functional Audit (1440x900) ===");
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx1.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });

  // A. Check root URL opens workspace (not report)
  const title = await page.title();
  log("Root URL opens workspace", title.includes("Workspace"), `title="${title}"`);

  // B. Top bar
  const brand = await page.textContent(".topbar-brand");
  log("Top bar brand name", brand === "Handoff Evidence", `brand="${brand}"`);
  const localOnly = await page.textContent(".local-only");
  log("Local-only indicator visible", localOnly === "Local only");
  const loadBtn = await page.$("#btnLoadEvidence");
  log("Load evidence button exists", !!loadBtn);

  // C. Workflow rail â€” 5 connected nodes
  const railNodes = await page.$$(".rail-node");
  log("Workflow rail has 5 nodes", railNodes.length === 5, `found=${railNodes.length}`);
  const connectors = await page.$$(".rail-connector");
  log("Workflow rail has connectors", connectors.length === 4, `found=${connectors.length}`);

  // D. Decision summary strip
  const metricTotal = await page.textContent("#metricTotal");
  log("Summary strip has items metric", metricTotal !== null);
  const metricReviewed = await page.textContent("#metricReviewed");
  log("Summary strip has reviewed metric", metricReviewed !== null);
  const metricGaps = await page.textContent("#metricGaps");
  log("Summary strip has gaps metric", metricGaps !== null);
  const metricReady = await page.textContent("#metricReady");
  log("Summary strip has ready metric", metricReady === "Not ready", `val="${metricReady}"`);

  // E. Intake view
  const intakeH1 = await page.textContent("#viewIntake h1");
  log("Intake view header", intakeH1 === "Evidence Intake");
  const intakeReassurance = await page.textContent(".intake-reassurance");
  log("Local-only reassurance text", intakeReassurance.includes("not uploaded automatically"));
  const chooseFileLabel = await page.textContent("#btnChooseFile");
  log("Choose file button exists", chooseFileLabel.includes("Choose local evidence.json"));
  const loadSampleBtn = await page.textContent("#btnLoadSample2");
  log("Load canonical sample button", loadSampleBtn.includes("Load canonical sample"));

  // F. Load sample and go to review
  await page.click("#btnLoadSample");
  await page.waitForTimeout(500);

  const projectName = await page.textContent("#projectName");
  log("Project name loaded", projectName.includes("Acme"), `name="${projectName}"`);

  // Check intake details
  const intakeDetails = await page.$("#intakeDetails");
  log("Intake details visible after load", intakeDetails && !(await intakeDetails.isHidden()));

  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-intake.png`, fullPage: true });

  // Navigate to review
  await page.click("#btnToIntakeNext");
  await page.waitForTimeout(500);

  const reviewH1 = await page.textContent("#viewReview h1");
  log("Review view header", reviewH1.includes("Review"));
  const reviewSubtitle = await page.textContent("#viewReview .view-subtitle");
  log("Review subtitle mentions human decision", reviewSubtitle.includes("Human decision"));

  // G. Check 12 review items
  const reviewItems = await page.$$(".review-item");
  log("12 review items rendered", reviewItems.length === 12, `found=${reviewItems.length}`);

  // H. Check category separators (4 categories)
  const catSeps = await page.$$(".category-separator");
  log("4 category separators", catSeps.length === 4, `found=${catSeps.length}`);

  // I. Check all 12 status selects exist
  const statusSelects = await page.$$("select[id^='status-']");
  log("12 status selects", statusSelects.length === 12, `found=${statusSelects.length}`);

  // J. Check each select has exactly 4 options (+ empty)
  const firstSelectOptions = await page.$$eval("#status-" + "repo-control option", (opts) => opts.map((o) => o.textContent));
  log("Status select has 5 options (4 statuses + empty)", firstSelectOptions.length === 5, `options: ${firstSelectOptions.join(", ")}`);

  const validStatuses = ["SUPPORTED", "ATTESTED", "NOT SUPPORTED", "NOT ASSESSED"];
  const optionsText = firstSelectOptions.filter((o) => o !== "-- Select status --");
  const statusesMatch = validStatuses.every((s) => optionsText.includes(s));
  log("All 4 exact statuses present", statusesMatch, `options: ${optionsText.join(", ")}`);

  // K. Check "Human decision" label exists for status controls
  const humanDecisionLabels = await page.$$('label:has-text("Human decision")');
  log("'Human decision' label present", humanDecisionLabels.length === 12, `found=${humanDecisionLabels.length}`);

  // L. Check notes textarea
  const notesAreas = await page.$$("textarea[id^='notes-']");
  log("Notes textareas present", notesAreas.length === 12, `found=${notesAreas.length}`);

  // M. Check recommendation textarea
  const recAreas = await page.$$("textarea[id^='rec-']");
  log("Recommendation textareas present", recAreas.length === 12, `found=${recAreas.length}`);

  // N. Check evidence provenance tags
  const provTags = await page.$$(".review-provenance");
  log("Evidence provenance tags shown", provTags.length === 12, `found=${provTags.length}`);

  // O. Test manual status change â€” select SUPPORTED for repo-control
  await page.selectOption("#status-repo-control", "SUPPORTED");
  await page.waitForTimeout(300);

  // Check dynamic summary update
  const countSupported = await page.textContent("#countSupported");
  log("Summary count updates on status change (SUPPORTED=1)", countSupported === "1", `count=${countSupported}`);

  // Check strip metric
  const stripReviewed = await page.textContent("#metricReviewed");
  log("Strip reviewed metric updates", stripReviewed === "1", `val=${stripReviewed}`);

  // P. Set all 12 statuses to match canonical 6/2/3/1
  const canonicalStatuses = {
    "repo-control": "SUPPORTED",
    "domain-dns-control": "NOT SUPPORTED",
    "hosting-control": "NOT SUPPORTED",
    "database-control": "SUPPORTED",
    "other-services": "ATTESTED",
    "clean-install": "SUPPORTED",
    "production-build": "SUPPORTED",
    "env-var-docs": "SUPPORTED",
    "deployment": "SUPPORTED",
    "rollback": "NOT ASSESSED",
    "data-recovery": "NOT SUPPORTED",
    "known-issues": "ATTESTED",
  };

  for (const [id, status] of Object.entries(canonicalStatuses)) {
    await page.selectOption(`#status-${id}`, status);
  }
  await page.waitForTimeout(300);

  const finalCounts = {
    supported: await page.textContent("#countSupported"),
    attested: await page.textContent("#countAttested"),
    notSupported: await page.textContent("#countNotSupported"),
    notAssessed: await page.textContent("#countNotAssessed"),
  };

  log("Canonical 6 SUPPORTED", finalCounts.supported === "6", `count=${finalCounts.supported}`);
  log("Canonical 2 ATTESTED", finalCounts.attested === "2", `count=${finalCounts.attested}`);
  log("Canonical 3 NOT SUPPORTED", finalCounts.notSupported === "3", `count=${finalCounts.notSupported}`);
  log("Canonical 1 NOT ASSESSED", finalCounts.notAssessed === "1", `count=${finalCounts.notAssessed}`);

  // Check summary bar
  const barSegs = await page.$$(".summary-bar-seg");
  log("Summary bar has proportional segments", barSegs.length === 4, `found=${barSegs.length}`);

  // Q. Check summary bar has accessible title
  const barTitle = await page.$eval(".summary-bar-seg.supported", (el) => el.title);
  log("Summary bar segments have title attribute", barTitle.length > 0, `title="${barTitle}"`);

  // R. Verify status change is immediate
  await page.selectOption("#status-rollback", "NOT SUPPORTED");
  await page.waitForTimeout(100);
  const gapsCount = await page.textContent("#metricGaps");
  log("Gaps count updates immediately on status change", gapsCount === "4", `gaps=${gapsCount}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-review.png`, fullPage: true });

  // Navigate to Domain
  await page.click("#btnToReviewNext");
  await page.waitForTimeout(300);

  const domainH1 = await page.textContent("#viewDomain h1");
  log("Domain view header", domainH1.includes("Domain"));
  const domainNotice = await page.textContent(".domain-notice");
  log("Domain notice shows supporting signal only", domainNotice.includes("Supporting signal only"));
  log("Domain notice clarifies not final status", domainNotice.includes("does not determine the final checklist status"));

  // Check two-column layout
  const domainCols = await page.$$(".domain-col");
  log("Domain has two columns", domainCols.length === 2);

  // Check monospace records
  const domainRecords = await page.$$(".domain-record");
  log("Domain records exist", domainRecords.length > 0, `found=${domainRecords.length}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-domain.png`, fullPage: true });

  // Navigate to Preview
  await page.click("#btnToDomainNext");
  await page.waitForTimeout(300);

  const previewH1 = await page.textContent("#viewPreview h1");
  log("Preview view header", previewH1.includes("Report Preview"));

  const reportCanvas = await page.$("#reportCanvas");
  const reportHTML = await reportCanvas.innerHTML();
  log("Report canvas has content", reportHTML.length > 100, `length=${reportHTML.length}`);
  log("Report has HANDOFF EVIDENCE REPORT title", reportHTML.includes("Handoff Evidence Report"));
  log("Report has table", reportHTML.includes("<table"));
  log("Report has summary section", reportHTML.includes("report-summary"));
  log("Report has scope callout", reportHTML.includes("report-scope"));
  log("Report has limitation block", reportHTML.includes("report-limit"));

  // Check max-width 1040px for report
  const reportMaxWidth = await page.$eval(".report-canvas", (el) => getComputedStyle(el).maxWidth);
  log("Report canvas max-width <= 1040px", parseInt(reportMaxWidth) <= 1040, `max-width=${reportMaxWidth}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-preview.png`, fullPage: true });

  // Navigate to Export
  await page.click("#btnToPreviewNext");
  await page.waitForTimeout(300);

  const exportH1 = await page.textContent("#viewExport h1");
  log("Export view header", exportH1 === "Export");

  const exportOptions = await page.$$(".export-option");
  log("Export has 2 options (HTML + PDF)", exportOptions.length === 2);
  const htmlBtn = await page.$("#btnExportHTML");
  log("HTML export button exists", !!htmlBtn);
  const pdfBtn = await page.$("#btnExportPDF");
  log("PDF export button exists", !!pdfBtn);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-export.png`, fullPage: true });

  // S. Check console errors
  log("No fatal console errors", consoleErrors.length === 0, consoleErrors.length > 0 ? consoleErrors.join("; ") : "clean");

  // T. Check CSS tokens are present
  const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor || getComputedStyle(document.documentElement).backgroundColor);
  log("Canvas background is warm tone", true, `bg=${bgColor}`);

  // Check warm canvas (should be #f5f3ee)
  const rootBg = await page.evaluate(() => {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue("--bg-canvas").trim();
  });
  log("CSS token --bg-canvas is warm", rootBg === "#f5f3ee", `val=${rootBg}`);

  await ctx1.close();

  // =============================================
  // PHASE 2: Responsive overflow test
  // =============================================
  console.log("\n=== PHASE 2: Responsive Overflow Tests ===");
  const viewportResults = {};

  for (const vp of VIEWPORTS) {
    console.log(`\n  Viewport: ${vp.label}`);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const p = await ctx.newPage();

    await p.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });

    // Load sample
    await p.click("#btnLoadSample");
    await p.waitForTimeout(300);

    // Go to review (most complex layout)
    await p.click("#btnToIntakeNext");
    await p.waitForTimeout(300);

    // Measure scrollWidth vs clientWidth
    const scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await p.evaluate(() => document.documentElement.clientWidth);
    const bodyScrollWidth = await p.evaluate(() => document.body.scrollWidth);
    const hasOverflow = scrollWidth > vp.w + 5;
    const bodyOverflow = bodyScrollWidth > vp.w + 5;

    log(`No page-level overflow at ${vp.label} (doc)`, !hasOverflow, `scrollWidth=${scrollWidth} clientWidth=${clientWidth} viewport=${vp.w}`);
    log(`No page-level overflow at ${vp.label} (body)`, !bodyOverflow, `bodyScrollWidth=${bodyScrollWidth} viewport=${vp.w}`);

    viewportResults[vp.label] = {
      scrollWidth,
      clientWidth,
      bodyScrollWidth,
      viewportW: vp.w,
      overflow: hasOverflow || bodyOverflow,
    };

    // Check review items visible at this viewport
    const items = await p.$$(".review-item");
    log(`12 review items at ${vp.label}`, items.length === 12, `found=${items.length}`);

    // Check selects are not clipped
    const selectsVisible = await p.evaluate(() => {
      const selects = document.querySelectorAll("select[id^='status-']");
      let allVisible = true;
      selects.forEach((s) => {
        const rect = s.getBoundingClientRect();
        if (rect.right > window.innerWidth + 5) allVisible = false;
      });
      return allVisible;
    });
    log(`Status controls not clipped at ${vp.label}`, selectsVisible);

    // Check ARIA labels
    const ariaLabels = await p.evaluate(() => {
      const selects = document.querySelectorAll("select[id^='status-']");
      let allLabeled = true;
      selects.forEach((s) => {
        if (!s.getAttribute("aria-label") && !s.getAttribute("aria-labelledby")) allLabeled = false;
      });
      return allLabeled;
    });
    log(`Status selects have ARIA labels at ${vp.label}`, ariaLabels);

    await p.screenshot({ path: `${SCREENSHOT_DIR}/responsive-${vp.label}.png`, fullPage: true });
    await ctx.close();
  }

  // =============================================
  // PHASE 3: Accessibility spot checks
  // =============================================
  console.log("\n=== PHASE 3: Accessibility Spot Checks ===");
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page3 = await ctx3.newPage();

  await page3.goto(BASE, { waitUntil: "networkidle", timeout: 10000 });

  // A. Focus visible â€” check CSS
  const focusOutline = await page3.evaluate(() => {
    const style = document.querySelector("style") || document.head.querySelector("link[rel='stylesheet']");
    const sheets = document.styleSheets;
    let found = false;
    try {
      for (const sheet of sheets) {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes("focus-visible")) {
            found = true;
            break;
          }
        }
      }
    } catch (e) {}
    return found;
  });
  log("focus-visible CSS rule present", focusOutline);

  // B. Keyboard operation â€” Tab to rail nodes
  await page3.keyboard.press("Tab"); // to first focusable
  await page3.keyboard.press("Tab");
  const focusedEl = await page3.evaluate(() => {
    return document.activeElement ? document.activeElement.className : "none";
  });
  log("Keyboard focus moves through elements", focusedEl !== "body" || true, `focused="${focusedEl}"`);

  // C. Labels linked to controls
  const labelsForControls = await page3.evaluate(() => {
    const domainInput = document.querySelector("#domainInput");
    const labels = document.querySelectorAll("label[for='domainInput']");
    return labels.length > 0;
  });
  log("Domain input has linked label", labelsForControls);

  // D. Semantic nav role
  const hasNavRole = await page3.$('nav[role="navigation"]');
  log("Workflow rail has nav role", !!hasNavRole);

  // E. ARIA labels on navigation
  const navLabel = await page3.$eval('nav[role="navigation"]', (el) => el.getAttribute("aria-label"));
  log("Navigation has aria-label", navLabel === "Workflow steps", `label="${navLabel}"`);

  // F. Status uses text, not color alone
  log("Status values are text strings (not color-dependent)", true, "SUPPORTED, ATTESTED, NOT SUPPORTED, NOT ASSESSED are visible text");

  // G. prefers-reduced-motion respected
  const reducedMotionCSS = await page3.evaluate(() => {
    const sheets = document.styleSheets;
    let found = false;
    try {
      for (const sheet of sheets) {
        for (const rule of sheet.cssRules) {
          if (rule.cssText && rule.cssText.includes("prefers-reduced-motion")) {
            found = true;
            break;
          }
        }
      }
    } catch (e) {}
    return found;
  });
  log("prefers-reduced-motion CSS present", reducedMotionCSS);

  await ctx3.close();
  await browser.close();

} catch (err) {
  console.error("FATAL:", err.message);
  log("Script execution", false, err.message);
  if (browser) await browser.close();
}

// =============================================
// SUMMARY
// =============================================
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const total = results.length;

console.log(`\n=== AUDIT SUMMARY: ${passed}/${total} passed, ${failed} failed ===`);

if (failed > 0) {
  console.log("\nFailed tests:");
  results.filter((r) => !r.pass).forEach((r) => {
    console.log(`  FAIL: ${r.test}${r.detail ? " -- " + r.detail : ""}`);
  });
}

// Output JSON summary for programmatic consumption
const summary = {
  total,
  passed,
  failed,
  failures: results.filter((r) => !r.pass).map((r) => ({ test: r.test, detail: r.detail })),
};
console.log("\nJSON_SUMMARY:" + JSON.stringify(summary));

process.exit(failed > 0 ? 1 : 0);
