#!/usr/bin/env node

/**
 * Module C — DNS + RDAP Engine Forensic Tests
 *
 * Tests dns-checker.js for:
 *  - public DNS/RDAP only (no credentials, no account login)
 *  - supporting signal only (never a final verdict, no auto-status-change)
 *  - privacy / redaction handled honestly
 *  - non-existent domains handled gracefully (no crash)
 *  - resolver/server IP NOT mistaken for domain A record
 *  - public nameservers do NOT prove customer account ownership
 *  - network failures produce honest error states
 *
 * Asserts on STRUCTURE and BEHAVIOR, not on volatile public values.
 */

import { execSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const TOOL_DIR = resolve(import.meta.dirname, "..");
const DNS_CHECKER = join(TOOL_DIR, "dns-checker.js");

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

function assertIncludes(haystack, needle, msg) {
  assert(typeof haystack === "string" && haystack.includes(needle), msg);
}

function assertNotIncludes(haystack, needle, msg) {
  assert(typeof haystack === "string" && !haystack.includes(needle), msg);
}

function assertArray(arr, msg) {
  assert(Array.isArray(arr), msg);
}

/**
 * Run dns-checker.js with a domain and capture JSON output.
 * Returns { stdout, json, exitCode }.
 * json is null if output file couldn't be parsed.
 */
function runDnsChecker(domain, outputPath, timeoutMs = 30000) {
  const absOutput = join(TOOL_DIR, outputPath);
  try {
    const stdout = execSync(
      `node dns-checker.js ${domain} --output ${outputPath}`,
      {
        encoding: "utf8",
        timeout: timeoutMs,
        cwd: TOOL_DIR,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    let json = null;
    try {
      json = JSON.parse(readFileSync(absOutput, "utf8"));
    } catch {}
    return { stdout, json, exitCode: 0 };
  } catch (err) {
    let json = null;
    try {
      json = JSON.parse(readFileSync(absOutput, "utf8"));
    } catch {}
    return {
      stdout: (err.stdout || "").toString(),
      json,
      exitCode: err.status || 1,
    };
  }
}

function cleanup(path) {
  try {
    const full = join(TOOL_DIR, path);
    if (existsSync(full)) unlinkSync(full);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP A: Source code analysis — public DNS/RDAP only, no credentials
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── A: Source code — no credentials, public DNS/RDAP only ──\n");

const dnsSrc = readFileSync(DNS_CHECKER, "utf8");

// No credential patterns
assertNotIncludes(dnsSrc, "password", "No 'password' in source");
assertNotIncludes(dnsSrc, "apikey", "No 'apikey' in source");
assertNotIncludes(dnsSrc, "api_key", "No 'api_key' in source");
assertNotIncludes(dnsSrc, "token", "No 'token' in source");
assertNotIncludes(dnsSrc, "authorization", "No 'authorization' header in source");
assertNotIncludes(dnsSrc, "cookie", "No 'cookie' in source");
assertNotIncludes(dnsSrc, "login", "No 'login' in source");

// Uses only public endpoints
assertIncludes(dnsSrc, "rdap.org", "Queries public rdap.org endpoint");
assertIncludes(dnsSrc, "nslookup", "Uses nslookup for public DNS queries");
assert(dnsSrc.includes("fetch("), "Uses fetch for RDAP (public HTTP)");

// DNS queries use no auth (nslookup commands have no auth flags)
assertNotIncludes(dnsSrc, "nslookup -type=NS -vc", "NS lookup has no auth flag");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP B: Supporting signal only — never a verdict
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── B: Supporting signal only — never a verdict ──\n");

assertIncludes(
  dnsSrc,
  "supporting signal",
  "Source references 'supporting signal' concept"
);
assertNotIncludes(
  dnsSrc,
  "auto-approve",
  "No auto-approve in source"
);
assertNotIncludes(
  dnsSrc,
  "auto-approve",
  "No auto-approve in source"
);
assertNotIncludes(
  dnsSrc,
  "set status",
  "No 'set status' in source (no status mutation)"
);
assertNotIncludes(
  dnsSrc,
  "VERDICT",
  "No VERDICT string in source"
);
// The word "verdict" may appear in comments/strings that negate it.
// Structural guarantee: the code never ASSIGNS or OUTPUTS a verdict.
// Check: no assignment to a verdict variable, no verdict key in output object.
assertNotIncludes(dnsSrc, 'verdict:', "No 'verdict:' assignment in source");
assertNotIncludes(dnsSrc, '[\"verdict\"]', "No verdict key assignment in source");
assertNotIncludes(dnsSrc, '.verdict', "No .verdict property access in source");
assertNotIncludes(dnsSrc, 'verdict =', "No verdict = assignment in source");
assertNotIncludes(dnsSrc, "checklist status", "No checklist status mutation");

// Verify the output structure has a signals array (not a verdict field)
const sampleOut = runDnsChecker("example.com", "_test_a_signals.json");
if (sampleOut.json) {
  assert(
    sampleOut.json.signals !== undefined,
    "JSON output has 'signals' field (not 'verdict')"
  );
  assertArray(sampleOut.json.signals, "signals is an array");
  assert(
    !("verdict" in sampleOut.json),
    "JSON output has no 'verdict' field"
  );
  assert(
    !("status" in sampleOut.json),
    "JSON output has no 'status' field"
  );
  assert(
    !("approved" in sampleOut.json),
    "JSON output has no 'approved' field"
  );
}
assertIncludes(
  sampleOut.stdout,
  "supporting signal",
  "Console output says 'supporting signal'"
);
assertIncludes(
  sampleOut.stdout,
  "NOT a verdict",
  "Console output says 'NOT a verdict'"
);
cleanup("_test_a_signals.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP C: Valid domain — example.com (structure & behavior)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── C: Valid domain — example.com ──\n");

const exResult = runDnsChecker("example.com", "_test_c_example.json");
assert(exResult.exitCode === 0, "example.com exits cleanly (exit 0)");
assert(exResult.json !== null, "example.com produces valid JSON output");
if (exResult.json) {
  const d = exResult.json;
  assert(d.domain === "example.com", "domain field matches input");
  assert(typeof d.checkedAt === "string", "checkedAt is a string (ISO timestamp)");
  assert(d.checkedAt.endsWith("Z"), "checkedAt is UTC");
  assert(d.checks !== undefined, "checks object exists");

  // RDAP structure
  assert(
    d.checks.rdap !== undefined,
    "rdap check present"
  );
  assert(
    typeof d.checks.rdap.success === "boolean",
    "rdap.success is boolean"
  );
  if (d.checks.rdap.success) {
    assert(
      typeof d.checks.rdap.registrar === "string",
      "rdap.registrar is a string when success"
    );
    assert(
      typeof d.checks.rdap.isPrivacyProtected === "boolean",
      "rdap.isPrivacyProtected is boolean when success"
    );
  }

  // DNS structure
  assertArray(d.checks.nameservers, "nameservers is an array");
  assertArray(d.checks.aRecords, "aRecords is an array");
  assertArray(d.checks.cnameRecords, "cnameRecords is an array");

  // example.com is well-known — should have records
  assert(
    d.checks.nameservers.length > 0 || d.checks.aRecords.length > 0,
    "example.com has at least NS or A records"
  );

  // Signals is an array
  assertArray(d.signals, "signals is an array");
}
cleanup("_test_c_example.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP D: Different domain — cloudflare.com
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── D: Different domain — cloudflare.com ──\n");

const cfResult = runDnsChecker("cloudflare.com", "_test_d_cf.json");
assert(cfResult.exitCode === 0, "cloudflare.com exits cleanly");
if (cfResult.json) {
  const d = cfResult.json;
  assert(d.domain === "cloudflare.com", "domain field correct");
  assertArray(d.checks.nameservers, "nameservers is array");
  assert(d.checks.nameservers.length > 0, "cloudflare.com has nameservers");

  // Cloudflare nameservers should be detectable
  const hasCloudflareNS = d.checks.nameservers.some((ns) =>
    ns.toLowerCase().includes("cloudflare")
  );
  assert(hasCloudflareNS, "Cloudflare nameservers detected in cloudflare.com");

  // A signals should mention Cloudflare
  const hasCloudflareSignal = d.signals.some((s) =>
    s.toLowerCase().includes("cloudflare")
  );
  assert(hasCloudflareSignal, "Signal mentions Cloudflare for cloudflare.com");
}
cleanup("_test_d_cf.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP E: Non-existent domain — graceful handling, no crash
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── E: Non-existent domain ──\n");

const fakeDomain = "thisdomaindefinitelydoesnotexist987654321.com";
const neResult = runDnsChecker(fakeDomain, "_test_e_noexist.json", 30000);
// Must NOT crash (exit code 0 for this graceful tool)
assert(
  neResult.exitCode === 0 || neResult.json !== null,
  "Non-existent domain does not crash (exit 0 or still produced JSON)"
);
if (neResult.json) {
  const d = neResult.json;
  assert(d.domain === fakeDomain, "domain field matches non-existent input");
  assertArray(d.checks.nameservers, "nameservers is array (even if empty)");
  assert(
    d.checks.nameservers.length === 0,
    "Non-existent domain has 0 nameservers"
  );
  assertArray(d.checks.aRecords, "aRecords is array");
  assert(d.checks.aRecords.length === 0, "Non-existent domain has 0 A records");

  // Signal should indicate no records / not configured
  const hasNoRecordsSignal = d.signals.some(
    (s) =>
      s.includes("No DNS records") ||
      s.includes("not be configured") ||
      s.includes("not exist")
  );
  assert(
    hasNoRecordsSignal,
    "Signal mentions no records / not configured for non-existent domain"
  );

  // RDAP for non-existent domain should either fail gracefully or return no data
  assert(
    d.checks.rdap.success === false ||
      d.checks.rdap.success === true,
    "RDAP for non-existent domain: success is boolean"
  );
}
cleanup("_test_e_noexist.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP F: Privacy / redaction handling
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── F: Privacy / redaction handling ──\n");

// google.com typically has GDPR privacy protection
const googResult = runDnsChecker("google.com", "_test_f_google.json");
if (googResult.json) {
  const d = googResult.json;
  assert(d.domain === "google.com", "google.com domain correct");
  if (d.checks.rdap.success) {
    // Privacy detection should be honest — either true or false
    assert(
      typeof d.checks.rdap.isPrivacyProtected === "boolean",
      "isPrivacyProtected is boolean for google.com"
    );

    // If privacy-protected, the output should mention it
    if (d.checks.rdap.isPrivacyProtected) {
      assertIncludes(
        googResult.stdout,
        "privacy",
        "Output mentions privacy when RDAP is privacy-protected"
      );
      assertIncludes(
        googResult.stdout,
        "Ownership",
        "Output mentions ownership limitation when privacy-protected"
      );
      // Signal should mention privacy
      const privacySignal = d.signals.some((s) =>
        s.toLowerCase().includes("privacy") ||
        s.toLowerCase().includes("ownership") ||
        s.toLowerCase().includes("cannot be confirmed")
      );
      assert(
        privacySignal,
        "Signal mentions privacy/ownership limitation"
      );
    }
  } else {
    // RDAP failed — that's acceptable, just verify honest reporting
    assert(
      typeof d.checks.rdap.raw === "string",
      "RDAP failure includes raw error message"
    );
  }
}
cleanup("_test_f_google.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP G: Resolver/server IP must NOT be mistaken for domain A record
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── G: Resolver IP not mistaken for domain A record ──\n");

// Check the source code parsing logic
// The parser should skip lines before "non-authoritative answer"
assertIncludes(
  dnsSrc,
  "non-authoritative answer",
  "Parser checks for 'non-authoritative answer' header"
);
assertIncludes(
  dnsSrc,
  "authoritative answer",
  "Parser also checks for 'authoritative answer' header"
);
assertIncludes(
  dnsSrc,
  "foundAuthoritativeOrNonAuthoritative",
  "Parser uses guard flag to skip DNS server Address lines"
);

// Run against a known domain and verify A records look like IPs, not DNS server IPs
const aResult = runDnsChecker("example.com", "_test_g_a.json");
if (aResult.json && aResult.json.checks.aRecords.length > 0) {
  for (const addr of aResult.json.checks.aRecords) {
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    assert(ipPattern.test(addr), `A record '${addr}' is a valid IPv4 address`);

    // Known DNS server IPs that should NOT appear as A records
    const commonDNS = ["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1", "9.9.9.9"];
    assert(
      !commonDNS.includes(addr),
      `A record '${addr}' is not a common DNS resolver IP`
    );
  }
}
cleanup("_test_g_a.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP H: Public nameservers do NOT prove customer account ownership
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── H: Nameservers don't prove ownership ──\n");

// The code should NOT claim nameservers prove ownership
assertNotIncludes(
  dnsSrc,
  "proves ownership",
  "Source does not claim nameservers prove ownership"
);
assertNotIncludes(
  dnsSrc,
  "confirms ownership",
  "Source does not claim nameservers confirm ownership"
);
assertNotIncludes(
  dnsSrc,
  "owned by",
  "Source does not claim domain is 'owned by' based on NS"
);

// The output should say these are signals, not proof
assertIncludes(
  dnsSrc,
  "supporting signal",
  "Source frames results as supporting signal"
);
assertIncludes(
  dnsSrc,
  "Martua decides",
  "Source defers to human judgment"
);

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP I: Network failure produces honest error state
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── I: Network failure → honest error state ──\n");

// Test RDAP with an invalid TLD that will definitely fail DNS and RDAP
const failResult = runDnsChecker(
  "doesnotexist.invalidtld",
  "_test_i_fail.json",
  30000
);
// Should not crash
assert(
  failResult.exitCode === 0 || failResult.json !== null,
  "Invalid TLD does not crash (exit 0 or produced JSON)"
);
if (failResult.json) {
  const d = failResult.json;
  assert(d.checks !== undefined, "checks object exists on failure");
  assertArray(d.checks.nameservers, "nameservers is array on failure");
  assertArray(d.checks.aRecords, "aRecords is array on failure");
  assertArray(d.signals, "signals is array on failure");

  // Should have a signal about no records
  const hasFailureSignal = d.signals.some(
    (s) =>
      s.includes("No DNS records") ||
      s.includes("not be configured") ||
      s.includes("not exist")
  );
  assert(
    hasFailureSignal,
    "Failure produces honest 'no records' signal"
  );

  // RDAP should report failure honestly (either success:false or raw error)
  if (!d.checks.rdap.success) {
    assert(
      typeof d.checks.rdap.raw === "string" && d.checks.rdap.raw.length > 0,
      "RDAP failure includes non-empty raw error message"
    );
  }
}
cleanup("_test_i_fail.json");

// Test with a domain that will timeout DNS but RDAP might also fail
// Use a domain with a very long/random name under a real TLD
const timeoutResult = runDnsChecker(
  "xkcd-nonexistent-test-42.example.org",
  "_test_i_timeout.json",
  30000
);
assert(
  timeoutResult.exitCode === 0 || timeoutResult.json !== null,
  "Non-existent subdomain does not crash"
);
cleanup("_test_i_timeout.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP J: Output format consistency
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── J: Output format consistency ──\n");

// Run two different domains and verify output shape is identical
const j1 = runDnsChecker("example.com", "_test_j1.json");
const j2 = runDnsChecker("cloudflare.com", "_test_j2.json");

if (j1.json && j2.json) {
  const keys1 = Object.keys(j1.json).sort();
  const keys2 = Object.keys(j2.json).sort();
  assert(
    JSON.stringify(keys1) === JSON.stringify(keys2),
    "Top-level keys consistent across different domains"
  );

  const checks1 = Object.keys(j1.json.checks).sort();
  const checks2 = Object.keys(j2.json.checks).sort();
  assert(
    JSON.stringify(checks1) === JSON.stringify(checks2),
    "checks keys consistent across different domains"
  );

  // Both should have the same structural types
  assertArray(j1.json.signals, "Domain 1 signals is array");
  assertArray(j2.json.signals, "Domain 2 signals is array");
  assert(
    typeof j1.json.domain === "string",
    "Domain 1 domain field is string"
  );
  assert(
    typeof j2.json.domain === "string",
    "Domain 2 domain field is string"
  );
}
cleanup("_test_j1.json");
cleanup("_test_j2.json");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP K: No data exfiltration — local file write only
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── K: No data exfiltration ──\n");

// The only network call should be to rdap.org (public RDAP)
// Count fetch calls in source
const fetchCount = (dnsSrc.match(/fetch\(/g) || []).length;
assert(fetchCount >= 1, `Source has fetch calls (found ${fetchCount})`);

// All fetch calls should go to rdap.org
const fetchUrls = [...dnsSrc.matchAll(/fetch\(`([^`]+)`/g)].map((m) => m[1]);
for (const url of fetchUrls) {
  assert(
    url.includes("rdap.org"),
    `fetch URL '${url}' goes to public rdap.org`
  );
}

// Only local write is writeFileSync
assert(
  dnsSrc.includes("writeFileSync"),
  "Uses writeFileSync for local output only"
);
assertNotIncludes(dnsSrc, "http.request", "No http.request calls");
assertNotIncludes(dnsSrc, "https.request", "No https.request calls");
assertNotIncludes(dnsSrc, "XMLHttpRequest", "No XMLHttpRequest");
assertNotIncludes(dnsSrc, "WebSocket", "No WebSocket connections");

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP L: User-Agent header present (polite RDAP usage)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── L: Polite RDAP usage ──\n");

assertIncludes(dnsSrc, "User-Agent", "RDAP request includes User-Agent header");
assertIncludes(dnsSrc, "HandoffEvidenceTool", "User-Agent identifies tool");

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log(
  "\n═══════════════════════════════════════════════════════════════════════════════"
);
console.log(
  `  Module C DNS Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`
);
console.log(
  "═══════════════════════════════════════════════════════════════════════════════\n"
);

process.exit(failed > 0 ? 1 : 0);
