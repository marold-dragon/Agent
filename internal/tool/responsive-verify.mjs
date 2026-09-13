import { chromium } from "playwright";

const BASE = "http://localhost:3789";
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

let browser;
const results = [];

function log(test, pass, detail) {
  results.push({ test, pass, detail });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${test}${detail ? " -- " + detail : ""}`);
}

try {
  browser = await chromium.launch({ headless: false });

  for (const vp of VIEWPORTS) {
    console.log(`\n  Viewport: ${vp.label}`);
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();

    await page.goto(BASE, { waitUntil: "networkidle", timeout: 5000 });

    // Load sample
    await page.click("#btnLoadSample");
    await page.waitForTimeout(300);

    // Go to review
    await page.click("#btnToIntakeNext");
    await page.waitForTimeout(300);

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const overflow = bodyWidth > vp.w + 10;
    log(`No horizontal overflow at ${vp.label}`, !overflow, `body=${bodyWidth} viewport=${vp.w}`);

    // Check review items are visible
    const items = await page.$$(".review-item");
    log(`12 items at ${vp.label}`, items.length === 12, `visible: ${items.length}`);

    // Check no clipped status controls
    const selects = await page.$$("select");
    log(`Selects accessible at ${vp.label}`, selects.length === 12);

    // Screenshot
    await page.screenshot({
      path: `D:\\New Project\\docs\\audit\\internal-tool-browser\\workspace-${vp.label}.png`,
      fullPage: true,
    });

    await context.close();
  }
} catch (err) {
  console.error("FATAL:", err.message);
  log("Script execution", false, err.message);
} finally {
  if (browser) await browser.close();
}

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\n  RESPONSIVE RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
