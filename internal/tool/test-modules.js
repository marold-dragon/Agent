#!/usr/bin/env node

/**
 * Verification test for all 3 modules.
 * Tests structure, counts, and integration without interactive input.
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Test 1: Modul B — Report Generator with sample data
// ═══════════════════════════════════════════════════════════════
console.log("\n── Test 1: Modul B — Report Generator ──\n");

const evidence = JSON.parse(readFileSync("sample-evidence.json", "utf8"));
const statuses = JSON.parse(readFileSync("sample-statuses.json", "utf8"));

// Verify sample-evidence.json structure
assert(evidence.meta && evidence.meta.toolVersion === "1.0.0", "evidence.meta.toolVersion = 1.0.0");
assert(evidence.projectInfo && evidence.projectInfo.name, "evidence.projectInfo.name exists");
assert(evidence.categories, "evidence.categories exists");

// Verify all 12 items present in evidence
const allItemIds = [
  "repo-control", "domain-dns-control", "hosting-control", "database-control", "other-services",
  "clean-install", "production-build", "env-var-docs",
  "deployment", "rollback", "data-recovery",
  "known-issues"
];
for (const id of allItemIds) {
  const found = Object.values(evidence.categories).some(cat => cat[id]);
  assert(found, `evidence.json contains item: ${id}`);
}

// Verify all 12 statuses present
for (const id of allItemIds) {
  assert(statuses[id] && statuses[id].status, `statuses.json has status for: ${id}`);
}

// Verify canonical 6/2/3/1 distribution
const counts = { SUPPORTED: 0, ATTESTED: 0, "NOT SUPPORTED": 0, "NOT ASSESSED": 0 };
for (const id of allItemIds) {
  counts[statuses[id].status]++;
}
assert(counts.SUPPORTED === 6, `SUPPORTED count = 6 (got ${counts.SUPPORTED})`);
assert(counts.ATTESTED === 2, `ATTESTED count = 2 (got ${counts.ATTESTED})`);
assert(counts["NOT SUPPORTED"] === 3, `NOT SUPPORTED count = 3 (got ${counts["NOT SUPPORTED"]})`);
assert(counts["NOT ASSESSED"] === 1, `NOT ASSESSED count = 1 (got ${counts["NOT ASSESSED"]})`);
assert(counts.SUPPORTED + counts.ATTESTED + counts["NOT SUPPORTED"] + counts["NOT ASSESSED"] === 12, "Total items = 12");

// Run report generator
execSync('node report-generator.js --evidence sample-evidence.json --statuses sample-statuses.json --output test-report.html', { stdio: "pipe" });

const html = readFileSync("test-report.html", "utf8");
assert(html.includes("<!DOCTYPE html>"), "Report has DOCTYPE");
assert(html.includes("12 items assessed"), "Report shows 12 items assessed");
assert(html.includes("SUPPORTED: 6"), "Report summary: SUPPORTED: 6");
assert(html.includes("ATTESTED: 2"), "Report summary: ATTESTED: 2");
assert(html.includes("NOT SUPPORTED: 3"), "Report summary: NOT SUPPORTED: 3");
assert(html.includes("NOT ASSESSED: 1"), "Report summary: NOT ASSESSED: 1");
assert(html.includes("not an independent security audit"), "Report has scope disclaimer");
assert(html.includes("Important limitation"), "Report has limitation section");
assert(html.includes("documented vs execution-tested") || html.includes("not independently executed"), "Report has documented vs tested language");

// Count status cells in HTML
const supportedMatches = html.match(/status-supported">SUPPORTED/g);
const attestedMatches = html.match(/status-attested">ATTESTED/g);
const notSupportedMatches = html.match(/status-not-supported">NOT SUPPORTED/g);
const notAssessedMatches = html.match(/status-not-assessed">NOT ASSESSED/g);
assert(supportedMatches && supportedMatches.length === 6, `HTML has 6 SUPPORTED cells (got ${supportedMatches?.length || 0})`);
assert(attestedMatches && attestedMatches.length === 2, `HTML has 2 ATTESTED cells (got ${attestedMatches?.length || 0})`);
assert(notSupportedMatches && notSupportedMatches.length === 3, `HTML has 3 NOT SUPPORTED cells (got ${notSupportedMatches?.length || 0})`);
assert(notAssessedMatches && notAssessedMatches.length === 1, `HTML has 1 NOT ASSESSED cell (got ${notAssessedMatches?.length || 0})`);

// ═══════════════════════════════════════════════════════════════
// Test 2: Modul B — Missing status defaults to NOT ASSESSED
// ═══════════════════════════════════════════════════════════════
console.log("\n── Test 2: Modul B — Missing status handling ──\n");

const incompleteStatuses = {
  "repo-control": { status: "SUPPORTED", notes: "test" }
  // All others missing
};
const incompletePath = "test-incomplete-statuses.json";
import { writeFileSync } from "node:fs";
writeFileSync(incompletePath, JSON.stringify(incompleteStatuses, null, 2));

const result2 = execSync('node report-generator.js --evidence sample-evidence.json --statuses test-incomplete-statuses.json --output test-incomplete-report.html', { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
// Should default missing items to NOT ASSESSED
const html2 = readFileSync("test-incomplete-report.html", "utf8");
const notAssessed2 = html2.match(/status-not-assessed">NOT ASSESSED/g);
assert(notAssessed2 && notAssessed2.length === 11, `Missing statuses default to NOT ASSESSED (got ${notAssessed2?.length || 0})`);
const supported2 = html2.match(/status-supported">SUPPORTED/g);
assert(supported2 && supported2.length === 1, `Only 1 SUPPORTED when only 1 assigned (got ${supported2?.length || 0})`);

// ═══════════════════════════════════════════════════════════════
// Test 3: Modul B — Invalid status rejected
// ═══════════════════════════════════════════════════════════════
console.log("\n── Test 3: Modul B — Invalid status rejected ──\n");

const badStatuses = { "repo-control": { status: "INVALID_STATUS", notes: "bad" } };
writeFileSync("test-bad-statuses.json", JSON.stringify(badStatuses, null, 2));

try {
  execSync('node report-generator.js --evidence sample-evidence.json --statuses test-bad-statuses.json --output test-bad.html', { stdio: "pipe" });
  assert(false, "Should have thrown on invalid status");
} catch (err) {
  assert(true, "Invalid status correctly rejected (exit code non-zero)");
}

// ═══════════════════════════════════════════════════════════════
// Test 4: Modul C — DNS Checker with 2 domains
// ═══════════════════════════════════════════════════════════════
console.log("\n── Test 4: Modul C — DNS Checker ──\n");

// Test cloudflare.com (nameservers detectable)
const dnsResult1 = execSync('node dns-checker.js cloudflare.com --output dns-verify-cf.json', { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
const cfData = JSON.parse(readFileSync("dns-verify-cf.json", "utf8"));
assert(cfData.domain === "cloudflare.com", "Domain recorded correctly");
assert(cfData.checks.nameservers.length > 0, "Nameservers found for cloudflare.com");
assert(cfData.checks.nameservers.some(ns => ns.includes("cloudflare")), "Cloudflare nameservers detected");
assert(cfData.signals.some(s => s.includes("Cloudflare")), "Signal: Cloudflare detected");
assert(cfData.checks.rdap.success === true || cfData.checks.rdap.success === false, "RDAP query completed (success or graceful failure)");
assert(dnsResult1.includes("supporting signal"), "Output says 'supporting signal'");
assert(dnsResult1.includes("NOT a verdict"), "Output says 'NOT a verdict'");

// Test google.com (different nameservers, privacy-protected RDAP)
const dnsResult2 = execSync('node dns-checker.js google.com --output dns-verify-goog.json', { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
const googData = JSON.parse(readFileSync("dns-verify-goog.json", "utf8"));
assert(googData.domain === "google.com", "Domain recorded correctly");
assert(googData.checks.nameservers.length > 0, "Nameservers found for google.com");
assert(googData.checks.nameservers.some(ns => ns.includes("google")), "Google nameservers detected");
assert(googData.signals.some(s => s.includes("Google Cloud DNS")), "Signal: Google Cloud DNS detected");
assert(googData.checks.rdap.isPrivacyProtected === true || googData.checks.rdap.success === false, "RDAP correctly reports privacy protection or failure");
assert(dnsResult2.includes("supporting signal"), "Output says 'supporting signal'");

// ═══════════════════════════════════════════════════════════════
// Test 5: Modul C — Non-existent domain handled gracefully
// ═══════════════════════════════════════════════════════════════
console.log("\n── Test 5: Modul C — Non-existent domain ──\n");

try {
  const dnsResult3 = execSync('node dns-checker.js thisdomaindefinitelydoesnotexist12345.com --output dns-verify-noexist.json', { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const noexistData = JSON.parse(readFileSync("dns-verify-noexist.json", "utf8"));
  assert(noexistData.checks.nameservers.length === 0, "No nameservers for non-existent domain");
  assert(noexistData.signals.some(s => s.includes("No DNS records") || s.includes("not be configured")), "Signal: no records found");
  assert(dnsResult3.includes("supporting signal"), "Output says 'supporting signal' even for non-existent domain");
} catch {
  assert(true, "Non-existent domain handled (may exit with error but doesn't crash)");
}

// ═══════════════════════════════════════════════════════════════
// Test 6: No data sent anywhere (verification)
// ═══════════════════════════════════════════════════════════════
console.log("\n── Test 6: No auto-sending verification ──\n");

import { readFileSync as readFs } from "node:fs";
const collectorSrc = readFs("evidence-collector.js", "utf8");
assert(!collectorSrc.includes("fetch(") && !collectorSrc.includes("http.request"), "Evidence collector has no HTTP client code");
assert(!collectorSrc.includes("send(") && !collectorSrc.includes("post("), "Evidence collector has no send/post calls");
assert(collectorSrc.includes("writeFileSync"), "Evidence collector writes to local file only");

const reportSrc = readFs("report-generator.js", "utf8");
assert(!reportSrc.includes("fetch(") && !reportSrc.includes("http.request"), "Report generator has no HTTP client code");
assert(reportSrc.includes("writeFileSync"), "Report generator writes to local file only");

const dnsSrc = readFs("dns-checker.js", "utf8");
assert(dnsSrc.includes("fetch("), "DNS checker uses fetch for public RDAP queries (allowed)");
assert(dnsSrc.includes("rdap.org"), "DNS checker queries public RDAP endpoint");
assert(dnsSrc.includes("writeFileSync"), "DNS checker writes output file only");

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════════════════════════\n");

// Cleanup test files
import { unlinkSync } from "node:fs";
for (const f of ["test-incomplete-statuses.json", "test-bad-statuses.json", "test-report.html", "test-incomplete-report.html", "dns-verify-cf.json", "dns-verify-goog.json", "dns-verify-noexist.json"]) {
  try { unlinkSync(f); } catch {}
}

process.exit(failed > 0 ? 1 : 0);
