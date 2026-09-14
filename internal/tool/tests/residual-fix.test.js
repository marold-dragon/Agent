#!/usr/bin/env node

/**
 * Residual-fix tests — Report generator honesty on assessment counts.
 *
 * Proves the P1 defect is fixed: a zero-decision statuses file (`{}`) must NOT
 * claim "12 items assessed". The summary must state the ACTUAL number of
 * human-set statuses and emit a visible "Assessment incomplete" notice.
 *
 * Also proves the full canonical sample still reads honestly:
 * "12 of 12 items assessed" with no incomplete notice.
 *
 * Runs from internal/tool/ (cwd) per project convention.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";

const TOOL_DIR = resolve(import.meta.dirname, "..");
const REPORT_GEN = join(TOOL_DIR, "report-generator.js");
const SAMPLE_EVIDENCE = join(TOOL_DIR, "sample-evidence.json");
const SAMPLE_STATUSES = join(TOOL_DIR, "sample-statuses.json");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL  ${msg}`);
  }
}

const TMP = [];

function tmp(name) {
  const p = join(TOOL_DIR, name);
  TMP.push(p);
  return p;
}

function cleanup() {
  for (const f of TMP) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {}
  }
}

function runReport(statusesPath, outputPath) {
  execFileSync(
    process.execPath,
    [REPORT_GEN, "--evidence", SAMPLE_EVIDENCE, "--statuses", statusesPath, "--output", outputPath],
    { cwd: TOOL_DIR, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
  return readFileSync(outputPath, "utf8");
}

try {
  // ── Zero decisions: {} ────────────────────────────────────────────────
  const zeroStatuses = tmp("_residual-zero.json");
  writeFileSync(zeroStatuses, "{}", "utf8");
  const zeroOut = tmp("_residual-zero.html");
  const zeroHtml = runReport(zeroStatuses, zeroOut);

  assert(
    zeroHtml.includes("0 of 12 items assessed"),
    "Zero-decision report states '0 of 12 items assessed'"
  );
  assert(
    !zeroHtml.includes("<strong>12 items assessed</strong>"),
    "Zero-decision report no longer claims '12 items assessed'"
  );
  assert(
    /Assessment incomplete/.test(zeroHtml),
    "Zero-decision report emits an 'Assessment incomplete' notice"
  );
  assert(
    /12 of 12 items have no human-set status/.test(zeroHtml),
    "Notice explains all 12 items have no human-set status"
  );
  // Absent items still default to NOT ASSESSED (behavior preserved, with warning)
  const zeroNa = (zeroHtml.match(/class="item-status status-not-assessed">NOT ASSESSED/g) || []).length;
  assert(zeroNa === 12, `Zero-decision report still shows 12 NOT ASSESSED rows (got ${zeroNa})`);

  // ── Full canonical sample: 12 human decisions ─────────────────────────
  const fullOut = tmp("_residual-full.html");
  const fullHtml = runReport(SAMPLE_STATUSES, fullOut);

  assert(
    fullHtml.includes("12 of 12 items assessed"),
    "Full sample states '12 of 12 items assessed'"
  );
  assert(
    !/Assessment incomplete/.test(fullHtml),
    "Full sample emits NO 'Assessment incomplete' notice"
  );

  // ── Partial: only 2 human decisions ───────────────────────────────────
  const partialStatuses = tmp("_residual-partial.json");
  writeFileSync(
    partialStatuses,
    JSON.stringify(
      {
        "repo-control": { status: "SUPPORTED", notes: "ok" },
        "clean-install": { status: "SUPPORTED", notes: "ok" },
      },
      null,
      2
    ),
    "utf8"
  );
  const partialOut = tmp("_residual-partial.html");
  const partialHtml = runReport(partialStatuses, partialOut);
  assert(
    partialHtml.includes("2 of 12 items assessed"),
    "Partial report states the ACTUAL '2 of 12 items assessed'"
  );
  assert(
    /Assessment incomplete/.test(partialHtml),
    "Partial report emits an 'Assessment incomplete' notice"
  );
  assert(
    /10 of 12 items have no human-set status/.test(partialHtml),
    "Partial notice reports 10 unassessed items"
  );
} catch (e) {
  assert(false, `Harness error: ${e.message}`);
} finally {
  cleanup();
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  Residual-fix Tests: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
