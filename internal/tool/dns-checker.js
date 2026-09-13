#!/usr/bin/env node

/**
 * Modul C — Domain/DNS Auto-Checker
 *
 * Runs locally on Martua's machine. Queries public WHOIS/RDAP and DNS data
 * for a given domain. Displays results as SUPPORTING SIGNALS only — never
 * produces a verdict or automatically changes any item status.
 *
 * Handles privacy-protected WHOIS honestly: reports the fact, does not guess.
 *
 * Usage: node dns-checker.js <domain> [--output results.json]
 */

import { execSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

// ── Helpers ─────────────────────────────────────────────────────────────────

function runCmd(command, timeoutMs = 15000) {
  try {
    const output = execSync(command, {
      encoding: "utf8",
      timeout: timeoutMs,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout || "").trim(),
      error: (err.stderr || "").trim(),
    };
  }
}

// ── DNS lookups using nslookup (available on Windows) ───────────────────────

function queryNameservers(domain) {
  // Get NS records via nslookup
  const result = runCmd(`nslookup -type=NS ${domain} 2>&1`, 10000);
  const lines = result.output.split("\n");
  const nameservers = [];
  for (const line of lines) {
    const match = line.match(/nameserver\s*=\s*(.+)/i);
    if (match) nameservers.push(match[1].trim());
  }
  return nameservers;
}

function queryARecords(domain) {
  const result = runCmd(`nslookup -type=A ${domain} 2>&1`, 10000);
  const lines = result.output.split("\n");
  const records = [];
  let inAnswerSection = false;
  let foundAuthoritativeOrNonAuthoritative = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect start of answer section
    if (lower.includes("non-authoritative answer") || lower.includes("authoritative answer")) {
      inAnswerSection = true;
      foundAuthoritativeOrNonAuthoritative = true;
      continue;
    }

    // If no answer section header found yet, skip lines (avoids capturing DNS server IP)
    if (!foundAuthoritativeOrNonAuthoritative) continue;

    // Match "Address:  1.2.3.4" or "Addresses:  1.2.3.4" (both singular and plural)
    const addrMatch = line.match(/(?:address(?:es)?:\s+)(\d+\.\d+\.\d+\.\d+)/i);
    if (addrMatch) {
      records.push(addrMatch[1]);
    }
  }

  return records;
}

function queryCNAMERecords(domain) {
  const result = runCmd(`nslookup -type=CNAME ${domain} 2>&1`, 10000);
  const lines = result.output.split("\n");
  const records = [];
  for (const line of lines) {
    const match = line.match(/canonical name\s*=\s*(.+)/i);
    if (match) records.push(match[1].trim());
  }
  return records;
}

// ── RDAP query (public WHOIS alternative) ───────────────────────────────────

async function queryRDAP(domain) {
  // Use Node.js built-in fetch (available in Node 18+) for RDAP
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`https://rdap.org/domain/${domain}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "HandoffEvidenceTool/1.0 (RDAP-lookup)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        raw: `RDAP HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const registrar = data.network?.name || data.handle || "unknown";
    const status = data.status || [];
    const events = data.events || [];

    // Check for privacy/proxy protection
    // Privacy protection manifests as:
    // 1. Explicit "redacted" or "privacy" strings in status/vcard
    // 2. Absence of registrant entity (GDPR redaction — very common)
    const fullJSON = JSON.stringify(data).toLowerCase();
    const hasExplicitPrivacy =
      status.some((s) =>
        s.toLowerCase().includes("redacted") || s.toLowerCase().includes("proxy")
      ) ||
      fullJSON.includes("redacted for privacy") ||
      fullJSON.includes("privacy protect") ||
      fullJSON.includes("whoisguard") ||
      fullJSON.includes("domains by proxy");

    // Check if any registrant entity exists (GDPR often removes these entirely)
    const allEntities = data.entities || [];
    function hasEntityWithRole(ents, role) {
      for (const e of ents) {
        if ((e.roles || []).includes(role)) return true;
        if (hasEntityWithRole(e.entities || [], role)) return true;
      }
      return false;
    }
    const hasRegistrantEntity = hasEntityWithRole(allEntities, "registrant");
    const isPrivacyProtected = hasExplicitPrivacy || !hasRegistrantEntity;

    let expiryDate = null;
    for (const event of events) {
      if (
        event.eventAction === "expiration" ||
        event.eventAction === "registration expiration"
      ) {
        expiryDate = event.eventDate;
      }
    }

    let registrationDate = null;
    for (const event of events) {
      if (event.eventAction === "registration") {
        registrationDate = event.eventDate;
      }
    }

    // Extract nameservers from RDAP
    const nsNames = (data.nameservers || []).map((ns) => ns.ldhName || ns.handle);

    // Build a safe preview (no sensitive data)
    const rawPreview = JSON.stringify(data, null, 2).slice(0, 3000);

    return {
      success: true,
      registrar,
      isPrivacyProtected,
      expiryDate,
      registrationDate,
      nameserversFromRDAP: nsNames,
      status,
      raw: rawPreview,
    };
  } catch (err) {
    return {
      success: false,
      raw: `RDAP query failed: ${err.message || err}`,
    };
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const domain = args.find((a) => !a.startsWith("--"));
  const outputIdx = args.indexOf("--output");
  const output =
    outputIdx !== -1 ? args[outputIdx + 1] : null;

  if (!domain) {
    console.error("Usage: node dns-checker.js <domain> [--output results.json]");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Domain/DNS Auto-Checker — ${domain}`);
  console.log("  All data is PUBLIC. This is a supporting signal, NOT a verdict.");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const results = { domain, checkedAt: new Date().toISOString(), checks: {} };

  // ── RDAP (WHOIS) ──────────────────────────────────────────────────────
  console.log("── RDAP (WHOIS) Query ──\n");
  const rdap = await queryRDAP(domain);
  results.checks.rdap = rdap;

  if (rdap.success) {
    console.log(`  Registrar (RDAP):     ${rdap.registrar}`);
    console.log(
      `  Privacy-protected:    ${rdap.isPrivacyProtected ? "YES — registrar info is privacy-protected/proxied" : "NO — registrar info is publicly visible"}`
    );
    if (rdap.expiryDate) console.log(`  Expiry date:          ${rdap.expiryDate}`);
    if (rdap.registrationDate)
      console.log(`  Registration date:    ${rdap.registrationDate}`);
    if (rdap.nameserversFromRDAP?.length) {
      console.log(`  Nameservers (RDAP):   ${rdap.nameserversFromRDAP.join(", ")}`);
    }
    console.log(
      `\n  ⚠ This is a supporting signal for Martua's assessment, not an automatic verdict.`
    );
    if (rdap.isPrivacyProtected) {
      console.log(
        `  ℹ Privacy-protected WHOIS is common and does not indicate a problem.`
      );
      console.log(
        `    Ownership cannot be confirmed from public RDAP data when privacy protection is active.`
      );
    }
  } else {
    console.log(`  RDAP query failed: ${rdap.raw}`);
    console.log(`  ℹ This does not mean the domain doesn't exist — RDAP may be unavailable.`);
  }

  // ── DNS Queries ───────────────────────────────────────────────────────
  console.log("\n── DNS Queries ──\n");

  const nameservers = queryNameservers(domain);
  results.checks.nameservers = nameservers;
  console.log(
    `  Nameservers:  ${nameservers.length > 0 ? nameservers.join(", ") : "(none found)"}`
  );

  const aRecords = queryARecords(domain);
  results.checks.aRecords = aRecords;
  console.log(
    `  A records:    ${aRecords.length > 0 ? aRecords.join(", ") : "(none found)"}`
  );

  const cnameRecords = queryCNAMERecords(domain);
  results.checks.cnameRecords = cnameRecords;
  console.log(
    `  CNAME records: ${cnameRecords.length > 0 ? cnameRecords.join(", ") : "(none found)"}`
  );

  // ── Signal interpretation ──────────────────────────────────────────────
  console.log("\n── Supporting Signals (for Martua's assessment) ──\n");

  const signals = [];
  if (nameservers.some((ns) => ns.toLowerCase().includes("cloudflare"))) {
    signals.push("Nameservers point to Cloudflare — domain likely uses Cloudflare for DNS/CDN.");
  }
  if (nameservers.some((ns) => ns.toLowerCase().includes("vercel"))) {
    signals.push("Nameservers point to Vercel — domain likely managed via Vercel.");
  }
  if (nameservers.some((ns) => ns.toLowerCase().includes("awsdns"))) {
    signals.push("Nameservers point to AWS Route 53.");
  }
  if (nameservers.some((ns) => ns.toLowerCase().includes("google"))) {
    signals.push("Nameservers point to Google Cloud DNS.");
  }
  if (cnameRecords.some((c) => c.toLowerCase().includes("vercel-dns"))) {
    signals.push("CNAME points to Vercel — consistent with Vercel deployment.");
  }
  if (cnameRecords.some((c) => c.toLowerCase().includes("pages.dev"))) {
    signals.push("CNAME points to Cloudflare Pages.");
  }
  if (cnameRecords.some((c) => c.toLowerCase().includes("netlify"))) {
    signals.push("CNAME points to Netlify.");
  }
  if (nameservers.length === 0 && aRecords.length === 0 && cnameRecords.length === 0) {
    signals.push("No DNS records found — domain may not be configured or may not exist.");
  }
  if (rdap.isPrivacyProtected) {
    signals.push(
      "WHOIS is privacy-protected — ownership cannot be confirmed from public data alone."
    );
  }

  if (signals.length > 0) {
    for (const s of signals) console.log(`  • ${s}`);
  } else {
    console.log("  No notable signals from public DNS data.");
  }

  console.log(
    "\n  ⚠ These are supporting signals only. Martua decides the final status."
  );

  results.signals = signals;

  // ── Output ────────────────────────────────────────────────────────────
  if (output) {
    const outputPath = resolve(output);
    writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`\n  Results written to: ${outputPath}`);
  }

  console.log(
    "\n═══════════════════════════════════════════════════════════════\n"
  );
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
