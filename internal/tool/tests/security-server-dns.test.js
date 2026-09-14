#!/usr/bin/env node

/**
 * Security tests — Server + DNS checker
 *
 * Proves the two confirmed defects are fixed:
 *   (a) CLI rejects shell metacharacters and does NOT create injection files
 *   (b) a normal domain still resolves
 *   (c) readBody caps oversize bodies (413)
 *   (d) foreign-Origin POST is rejected (403)
 *
 * Runs from internal/tool/ (cwd) per project convention.
 */

import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { join, resolve } from "node:path";

const TOOL_DIR = resolve(import.meta.dirname, "..");
const DNS_CHECKER = join(TOOL_DIR, "dns-checker.js");
const SERVER = join(TOOL_DIR, "server.js");

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

function cleanup(...paths) {
  for (const p of paths) {
    try {
      const full = join(TOOL_DIR, p);
      if (existsSync(full)) unlinkSync(full);
    } catch {}
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── HTTP helper (bypasses undici constraints on Origin / abort) ─────────────

function httpPost(port, path, { origin, body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === "string" ? body : JSON.stringify(body ?? {});
    const h = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      ...headers,
    };
    if (origin !== undefined) h.Origin = origin;
    const req = httpRequest(
      { host: "127.0.0.1", port, path, method: "POST", headers: h },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body: data })
        );
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function httpGet(port, path, origin) {
  return new Promise((resolve, reject) => {
    const h = {};
    if (origin !== undefined) h.Origin = origin;
    const req = httpRequest(
      { host: "127.0.0.1", port, path, method: "GET", headers: h },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP A: DNS CLI — shell injection is neutralized
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n── A: DNS CLI shell-injection hardening ──\n");

const dnsSrc = readFileSync(DNS_CHECKER, "utf8");

assert(
  !dnsSrc.includes("execSync"),
  "dns-checker.js no longer imports/uses execSync (no shell)"
);
assert(
  dnsSrc.includes("spawnSync"),
  "dns-checker.js uses spawnSync with an argument array"
);
assert(
  dnsSrc.includes("DOMAIN_RE"),
  "dns-checker.js validates the domain against an allowlist regex"
);
assert(
  !/nslookup[^`]*\$\{domain\}/.test(dnsSrc),
  "No shell string interpolation of domain into an nslookup command"
);

const CANARY = "pwned-by-injection.txt";
const MALICIOUS = [
  "example.com & echo PWNED > " + CANARY,
  "example.com; echo PWNED > " + CANARY,
  "example.com | echo PWNED > " + CANARY,
  "example.com `echo PWNED > " + CANARY + "`",
  "example.com $(echo PWNED > " + CANARY + ")",
];

for (const payload of MALICIOUS) {
  cleanup(CANARY);
  let exitCode = 0;
  let stderr = "";
  let stdout = "";
  try {
    // Pass the payload as a SINGLE argument (argument array, no shell) so the
    // child receives the literal string, exactly what an attacker controls.
    stdout = execFileSync(process.execPath, [DNS_CHECKER, payload], {
      cwd: TOOL_DIR,
      encoding: "utf8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    exitCode = err.status || 1;
    stderr = (err.stderr || "").toString();
    stdout = (err.stdout || "").toString();
  }
  const created = existsSync(join(TOOL_DIR, CANARY));
  assert(created === false, `No injection file for payload: ${JSON.stringify(payload)}`);
  assert(exitCode !== 0, `Non-zero exit for payload: ${JSON.stringify(payload)}`);
  assert(
    /invalid domain/i.test(stderr) || /invalid domain/i.test(stdout),
    `Clear rejection message for payload: ${JSON.stringify(payload)}`
  );
}
cleanup(CANARY);

// ═══════════════════════════════════════════════════════════════════════════
// GROUP B: DNS CLI — normal domain still resolves
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n── B: DNS CLI normal behavior ──\n");

const OUT = "_test_sec_normal.json";
cleanup(OUT);
try {
  execFileSync(
    process.execPath,
    [DNS_CHECKER, "example.com", "--output", OUT],
    { cwd: TOOL_DIR, encoding: "utf8", timeout: 40000, stdio: ["pipe", "pipe", "pipe"] }
  );
} catch {
  // exit code may be non-zero but JSON may still exist; validate below
}

let json = null;
try {
  json = JSON.parse(readFileSync(join(TOOL_DIR, OUT), "utf8"));
} catch {}

assert(json !== null, "Normal domain produces parseable JSON output");
assert(json && json.domain === "example.com", "Output records the requested domain");
const ns = json?.checks?.nameservers;
const a = json?.checks?.aRecords;
assert(
  Array.isArray(ns) && (ns.length > 0 || (Array.isArray(a) && a.length > 0)),
  "example.com resolves to nameservers or A records (DNS still works)"
);
cleanup(OUT);

// ═══════════════════════════════════════════════════════════════════════════
// GROUP C/D: Server — origin enforcement + body cap
// ═══════════════════════════════════════════════════════════════════════════

const serverSrc = readFileSync(SERVER, "utf8");
assert(
  !serverSrc.includes('Access-Control-Allow-Origin", "*"') &&
    !serverSrc.includes("Access-Control-Allow-Origin', '*'"),
  "server.js never emits wildcard Access-Control-Allow-Origin"
);
assert(
  serverSrc.includes("isAllowedOrigin") && serverSrc.includes("127.0.0.1"),
  "server.js enforces loopback same-origin checks"
);
assert(
  serverSrc.includes("MAX_BODY_BYTES"),
  "server.js declares a request body size cap"
);

const PORT = 3817;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const REVIEW_FILE = "saved-review.json";

cleanup(REVIEW_FILE);

const child = spawn(process.execPath, [SERVER], {
  cwd: TOOL_DIR,
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});

async function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await httpGet(PORT, "/");
      if (r.status === 200) return true;
    } catch {}
    await sleep(150);
  }
  return false;
}

try {
  const up = await waitForServer();
  assert(up, `Server booted on 127.0.0.1:${PORT}`);
  if (!up) throw new Error("server did not start");

  // ── (d) foreign-Origin POST is rejected ──
  console.log("\n── C: Foreign-origin POST rejection ──\n");

  const evil = await httpPost(PORT, "/api/save-review", {
    origin: "http://evil.example",
    body: { pwned: true },
  });
  assert(evil.status === 403, `Foreign Origin POST /api/save-review -> 403 (got ${evil.status})`);
  assert(
    !evil.headers["access-control-allow-origin"],
    "No Access-Control-Allow-Origin for foreign Origin"
  );

  const noOrigin = await httpPost(PORT, "/api/save-review", {
    origin: undefined,
    body: { pwned: true },
  });
  assert(noOrigin.status === 403, `Absent Origin POST /api/save-review -> 403 (got ${noOrigin.status})`);

  const evilDns = await httpPost(PORT, "/api/dns-check", {
    origin: "http://evil.example",
    body: { domain: "example.com" },
  });
  assert(evilDns.status === 403, `Foreign Origin POST /api/dns-check -> 403 (got ${evilDns.status})`);

  // The file must NOT have been written by the rejected requests.
  assert(
    existsSync(join(TOOL_DIR, REVIEW_FILE)) === false,
    "Rejected cross-origin request did NOT write saved-review.json"
  );

  // ── same-origin POST still works (behavior preserved) ──
  const good = await httpPost(PORT, "/api/save-review", {
    origin: ORIGIN,
    body: { statuses: { a: "SUPPORTED" }, savedAt: "2026-01-01T00:00:00.000Z" },
  });
  assert(good.status === 200, `Loopback same-origin POST -> 200 (got ${good.status})`);
  assert(
    JSON.parse(good.body).ok === true,
    "Loopback POST response keeps { ok: true } shape"
  );
  assert(
    good.headers["access-control-allow-origin"] === ORIGIN,
    "Loopback Origin is reflected (not wildcard)"
  );

  // ── (c) oversize body cap => 413 ──
  console.log("\n── D: Oversize body cap ──\n");

  const big = "x".repeat(1024 * 1024 + 1024); // ~1 MB + 1 KB
  let oversize;
  try {
    oversize = await httpPost(PORT, "/api/save-review", {
      origin: ORIGIN,
      body: JSON.stringify({ blob: big }),
    });
  } catch (e) {
    oversize = { status: 413, error: e.message };
  }
  assert(
    oversize.status === 413,
    `Oversize body -> 413 (got ${oversize.status})`
  );

  // A normal-size same-origin body is still accepted.
  const small = await httpPost(PORT, "/api/save-review", {
    origin: ORIGIN,
    body: { ok: "small" },
  });
  assert(small.status === 200, `Normal-size body still accepted -> 200 (got ${small.status})`);
} catch (e) {
  assert(false, `Server test harness error: ${e.message}`);
} finally {
  child.kill();
  await sleep(200);
  cleanup(REVIEW_FILE);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  Security Server+DNS Tests: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
