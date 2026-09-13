import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3799", { waitUntil: "networkidle" });
await p.click("#btnLoadSample");
await p.waitForTimeout(300);
await p.click("#btnToIntakeNext");
await p.waitForTimeout(300);

// Verify each review-item has 3 fields (status, notes, recommendation)
const fieldCounts = await p.$$eval(".review-item", items => items.map(item => {
  const fields = item.querySelectorAll(".review-field");
  return fields.length;
}));
console.log("Fields per review item:", fieldCounts);
console.log("All items have 3 fields:", fieldCounts.every(c => c === 3));

// Check the third field (rec) position
const recPos = await p.$$eval(".review-item:first-child .review-field:last-child", els => {
  return els.map(el => {
    const rect = el.getBoundingClientRect();
    return { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width) };
  });
});
console.log("First item recommendation field position:", recPos);

// Verify keyboard navigation - Tab through review controls
await p.focus("#status-repo-control");
await p.keyboard.press("Tab"); // should go to notes
const afterTab1 = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
console.log("After Tab from status:", afterTab1);

await p.keyboard.press("Tab"); // should go to rec
const afterTab2 = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
console.log("After Tab from notes:", afterTab2);

// Check if status controls work with keyboard (arrow keys in select)
await p.focus("#status-database-control");
await p.keyboard.press("ArrowDown");
await p.keyboard.press("Enter");
const dbStatus = await p.$eval("#status-database-control", el => el.value);
console.log("Status changed via keyboard:", dbStatus.length > 0 ? dbStatus : "(still empty - may need interaction)");

// Check touch target size for mobile (44px)
const selectHeight = await p.$eval("#status-repo-control", el => el.getBoundingClientRect().height);
console.log("Status select height:", Math.round(selectHeight), "px");

// Verify all semantic HTML roles
const roles = await p.evaluate(() => {
  return {
    banner: !!document.querySelector('[role="banner"]'),
    navigation: !!document.querySelector('[role="navigation"]'),
    main: !!document.querySelector('main'),
  };
});
console.log("Semantic roles:", roles);

// Check for any duplicate IDs
const duplicateIds = await p.evaluate(() => {
  const ids = {};
  document.querySelectorAll("[id]").forEach(el => {
    ids[el.id] = (ids[el.id] || 0) + 1;
  });
  return Object.entries(ids).filter(([k, v]) => v > 1).map(([k, v]) => `${k}:${v}`);
});
console.log("Duplicate IDs:", duplicateIds.length === 0 ? "None" : duplicateIds);

await b.close();
