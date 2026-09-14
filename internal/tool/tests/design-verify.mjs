import { chromium } from "playwright";
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3789}`;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE, { waitUntil: "networkidle" });
await p.click("#btnLoadSample");
await p.waitForTimeout(300);
await p.click("#btnToIntakeNext");
await p.waitForTimeout(300);

// Check review controls grid (should be 3 columns for status/notes/rec)
const grid = await p.$eval(".review-controls", el => getComputedStyle(el).gridTemplateColumns);
console.log("Review controls grid:", grid);

// Check review-item border radius
const radius = await p.$eval(".review-item", el => getComputedStyle(el).borderRadius);
console.log("Review item radius:", radius);

// Check category separator text
const cats = await p.$$eval(".category-separator h2", els => els.map(e => e.textContent));
console.log("Categories:", cats);

// Check review-item header flex layout
const headerFlex = await p.$eval(".review-item-header", el => getComputedStyle(el).display);
console.log("Review header display:", headerFlex);

// Check topbar height
const topbarH = await p.$eval(".topbar", el => getComputedStyle(el).height);
console.log("Topbar height:", topbarH);

// Check topbar sticky
const topbarPos = await p.$eval(".topbar", el => getComputedStyle(el).position);
console.log("Topbar position:", topbarPos);

// Check workflow rail connector width
const connW = await p.$eval(".rail-connector", el => getComputedStyle(el).width);
console.log("Rail connector width:", connW);

// Check rail dot size
const dotSize = await p.$eval(".rail-dot", el => getComputedStyle(el).width);
console.log("Rail dot size:", dotSize);

// Check canvas max-width
const canvasMax = await p.$eval(".canvas", el => getComputedStyle(el).maxWidth);
console.log("Canvas max-width:", canvasMax);

// Check intake panel radius
const intakeRadius = await p.$eval(".intake-panel", el => getComputedStyle(el).borderRadius);
console.log("Intake panel radius:", intakeRadius);

// Verify no dark backgrounds
const bodyBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log("Body background:", bodyBg);

// Verify no glassmorphism or neon
const allBgs = await p.evaluate(() => {
  const els = document.querySelectorAll("*");
  const problematic = [];
  for (const el of els) {
    const bg = getComputedStyle(el).background;
    if (bg.includes("gradient") || bg.includes("blur")) {
      problematic.push(el.className + ": " + bg.slice(0, 80));
    }
  }
  return problematic;
});
console.log("Problematic backgrounds:", allBgs.length === 0 ? "None (clean)" : allBgs);

await b.close();
