#!/usr/bin/env node
/**
 * Canonical `npm test` entry point.
 *
 * Runs the module integration suite (test-modules.js) AND every Node unit test
 * in tests/ (via run-unit-tests.mjs). Previously `npm test` ran only
 * test-modules.js, leaving the 5 test files in tests/ orphaned (H-003).
 *
 * Browser/Playwright tests are separate: `npm run test:browser`.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));

const STAGES = [
  ["module integration tests", "test-modules.js"],
  ["unit test suite", "run-unit-tests.mjs"],
];

let failed = 0;
for (const [label, script] of STAGES) {
  console.log(`\n########## ${label} (${script}) ##########`);
  const r = spawnSync(process.execPath, [resolve(TOOL_DIR, script)], {
    cwd: TOOL_DIR,
    stdio: "inherit",
    timeout: 300000,
  });
  if (r.status !== 0) {
    failed++;
    console.error(`  >>> STAGE FAILED: ${label} (exit ${r.status})`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(failed === 0
  ? "  ALL TEST STAGES PASSED"
  : `  ${failed} TEST STAGE(S) FAILED`);
console.log("═══════════════════════════════════════════════════════════════\n");
process.exit(failed > 0 ? 1 : 0);
