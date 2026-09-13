import { chromium } from "playwright";

const BASE = "http://localhost:3789";
const results = [];
let browser;

function log(test, pass, detail) {
  const icon = pass ? "PASS" : "FAIL";
  results.push({ test, pass, detail });
  console.log(`  [${icon}] ${test}${detail ? " -- " + detail : ""}`);
}

try {
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // 1. Root URL loads
  const resp = await page.goto(BASE, { waitUntil: "networkidle", timeout: 5000 });
  log("Root URL HTTP 200", resp.status() === 200, "Status: " + resp.status());

  // 2. Workspace loads
  const title = await page.title();
  log("Page title", title.includes("Handoff Evidence"), title);

  // 3. Workflow rail visible
  const rail = await page.$(".workflow-rail");
  log("Workflow rail visible", !!rail);

  // 4. Intake view visible
  const intake = await page.$("#viewIntake");
  const intakeVisible = intake && !(await intake.getAttribute("class"))?.includes("hidden");
  log("Intake view visible", intakeVisible);

  // 5. Load sample
  await page.click("#btnLoadSample");
  await page.waitForTimeout(500);

  // 6. Evidence loaded
  const projectText = await page.textContent("#projectName");
  log("Sample loaded - project name", projectText.includes("Acme"), projectText);

  // 7. Continue to Review
  await page.click("#btnToIntakeNext");
  await page.waitForTimeout(500);

  // 8. Review visible
  const review = await page.$("#viewReview");
  const reviewVisible = review && !(await review.getAttribute("class"))?.includes("hidden");
  log("Review view visible", reviewVisible);

  // 9. 12 items visible
  const items = await page.$$(".review-item");
  log("12 review items visible", items.length === 12, "Count: " + items.length);

  // 10. Category separators
  const cats = await page.$$(".category-separator");
  log("4 category separators", cats.length === 4, "Count: " + cats.length);

  // 11. Status selectors present
  const selects = await page.$$("select");
  log("Status selectors present", selects.length === 12, "Count: " + selects.length);

  // 12. Check canonical counts
  const countSupported = await page.textContent("#countSupported");
  const countAttested = await page.textContent("#countAttested");
  const countNotSupported = await page.textContent("#countNotSupported");
  const countNotAssessed = await page.textContent("#countNotAssessed");
  log("Canonical SUPPORTED=6", countSupported === "6", "Got: " + countSupported);
  log("Canonical ATTESTED=2", countAttested === "2", "Got: " + countAttested);
  log("Canonical NOT SUPPORTED=3", countNotSupported === "3", "Got: " + countNotSupported);
  log("Canonical NOT ASSESSED=1", countNotAssessed === "1", "Got: " + countNotAssessed);

  // 13. Change a status and verify count changes
  const firstSelect = await page.$("#status-repo-control");
  await firstSelect.selectOption("NOT SUPPORTED");
  await page.waitForTimeout(300);
  const newSupported = await page.textContent("#countSupported");
  const newNotSupported = await page.textContent("#countNotSupported");
  log("Status change updates count", newSupported === "5" && newNotSupported === "4",
    "SUPPORTED=" + newSupported + " NOT SUPPORTED=" + newNotSupported);

  // Restore
  await firstSelect.selectOption("SUPPORTED");
  await page.waitForTimeout(300);
  const restoredSupported = await page.textContent("#countSupported");
  log("Restore status restores count", restoredSupported === "6", "SUPPORTED=" + restoredSupported);

  // 14. Notes editable
  const notesArea = await page.$("#notes-repo-control");
  await notesArea.fill("Test note from verification");
  const notesVal = await notesArea.inputValue();
  log("Notes editable", notesVal === "Test note from verification");

  // 15. Navigate to Domain
  await page.click("#btnToReviewNext");
  await page.waitForTimeout(500);
  const domainView = await page.$("#viewDomain");
  const domainVisible = domainView && !(await domainView.getAttribute("class"))?.includes("hidden");
  log("Domain view visible", domainVisible);

  // 16. Domain notice visible
  const notice = await page.textContent(".domain-notice");
  log("Supporting signal disclaimer visible", notice.includes("Supporting signal"), notice.slice(0, 80));

  // 17. Navigate to Preview
  await page.click("#btnToDomainNext");
  await page.waitForTimeout(500);
  const previewView = await page.$("#viewPreview");
  const previewVisible = previewView && !(await previewView.getAttribute("class"))?.includes("hidden");
  log("Preview view visible", previewVisible);

  // 18. Report canvas has content
  const reportContent = await page.textContent("#reportCanvas");
  log("Report preview has content", reportContent.length > 100, "Length: " + reportContent.length);
  log("Report shows 12 items", reportContent.includes("12 items assessed"));

  // 19. Navigate to Export
  await page.click("#btnToPreviewNext");
  await page.waitForTimeout(500);
  const exportView = await page.$("#viewExport");
  const exportVisible = exportView && !(await exportView.getAttribute("class"))?.includes("hidden");
  log("Export view visible", exportVisible);

  // 20. Export buttons present
  const htmlBtn = await page.$("#btnExportHTML");
  const pdfBtn = await page.$("#btnExportPDF");
  log("HTML export button present", !!htmlBtn);
  log("PDF export button present", !!pdfBtn);

  // 21. No fatal console errors
  log("No fatal console errors", consoleErrors.length === 0,
    consoleErrors.length > 0 ? consoleErrors.join("; ") : "Clean");

  // Screenshot
  await page.screenshot({ path: "D:\\New Project\\docs\\audit\\internal-tool-browser\\workspace-1440x900.png", fullPage: true });
  console.log("  Screenshot saved: docs/audit/internal-tool-browser/workspace-1440x900.png");

} catch (err) {
  console.error("FATAL:", err.message);
  log("Script execution", false, err.message);
} finally {
  if (browser) await browser.close();
}

// Summary
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log("\n  RESULTS: " + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
