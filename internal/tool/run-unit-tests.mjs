#!/usr/bin/env node
/**
 * Canonical unit-test runner.
 *
 * H-003: these test files existed but were NOT executed by the previous
 * `npm test` (which ran only test-modules.js), so 400+ assertions silently
 * never ran in CI/local verification. This runner executes every Node unit
 * test in tests/ and fails if any file exits non-zero.
 *
 * Browser tests (Playwright) are intentionally excluded here and run via
 * `npm run test:browser`.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));

// Pure Node unit tests (no browser dependency).
const UNIT_TESTS = [
  "tests/dns-checker.test.js",
  "tests/module-a-evidence-collector.js",
  "tests/report-engine-semantics.test.js",
  "tests/residual-fix.test.js",
  "tests/security-server-dns.test.js",
  "tests/path-containment.test.mjs",
];

let failedFiles = 0;
for (const t of UNIT_TESTS) {
  const abs = resolve(TOOL_DIR, t);
  console.log(`\n══════ ${t} ══════`);
  const r = spawnSync(process.execPath, [abs], {
    cwd: TOOL_DIR,
    stdio: "inherit",
    timeout: 120000,
  });
  if (r.status !== 0) {
    failedFiles++;
    console.error(`  >>> ${t} FAILED (exit ${r.status})`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  UNIT FILES: ${UNIT_TESTS.length - failedFiles}/${UNIT_TESTS.length} passed`);
console.log("═══════════════════════════════════════════════════════════════\n");
process.exit(failedFiles > 0 ? 1 : 0);
