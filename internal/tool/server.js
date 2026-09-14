/**
 * Handoff Evidence Internal Tool — Local Browser Server
 * Serves the workspace application and provides DNS/RDAP API endpoint.
 * Local-only. No external data sending (Modules A/B).
 */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs";
import { resolve, join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const PORT = parseInt(process.env.PORT || "3789", 10);
const ROOT = resolve(import.meta.dirname, ".");

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB JSON body cap

// Only the expected loopback origins are treated as same-origin. Anything
// else (foreign Origin, missing Origin) is rejected on mutating endpoints.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname;
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "[::1]";
  const portOk = !url.port || url.port === String(PORT);
  return url.protocol === "http:" && loopback && portOk;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function serveFile(res, filePath) {
  readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    let done = false;

    function fail(code) {
      if (done) return;
      done = true;
      const err = new Error(code === 413 ? "Request body too large" : "Request aborted");
      err.statusCode = code;
      reject(err);
      // Drain any remaining request data so the response can still be written.
      req.resume();
    }

    req.on("data", (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        fail(413);
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      resolve(body);
    });
    req.on("error", () => fail(400));
  });
}

function runNslookup(domain, type) {
  // Invoke nslookup with an explicit ARGUMENT ARRAY (no shell), matching
  // dns-checker.js, so shell metacharacters in `domain` can never be
  // interpreted as commands.
  const result = spawnSync("nslookup", [`-type=${type}`, domain], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });

  if (result.error) {
    return "";
  }

  const stdout = (result.stdout || "").toString();
  const stderr = (result.stderr || "").toString();
  // Merge stdout+stderr to preserve the original `2>&1` capture semantics.
  return [stdout, stderr].filter((s) => s.trim().length > 0).join("\n");
}

function queryDNS(domain) {
  const nsOutput = runNslookup(domain, "NS");
  const aOutput = runNslookup(domain, "A");
  const cnameOutput = runNslookup(domain, "CNAME");

  // Parse nameservers
  const nameservers = [];
  const nsLines = nsOutput.split("\n");
  let inAnswer = false;
  for (const line of nsLines) {
    const lower = line.toLowerCase();
    if (lower.includes("non-authoritative answer") || lower.includes("authoritative answer")) {
      inAnswer = true;
      continue;
    }
    if (!inAnswer) continue;
    const match = line.match(/nameserver\s*=\s*(\S+)/i);
    if (match) nameservers.push(match[1].replace(/\.$/, ""));
  }

  // Parse A records
  const aRecords = [];
  const aLines = aOutput.split("\n");
  let inAAnswer = false;
  let foundSection = false;
  for (const line of aLines) {
    const lower = line.toLowerCase();
    if (lower.includes("non-authoritative answer") || lower.includes("authoritative answer")) {
      inAAnswer = true;
      foundSection = true;
      continue;
    }
    if (!foundSection) continue;
    const match = line.match(/address(?:es)?:\s+([\d.]+)/i);
    if (match) aRecords.push(match[1]);
  }

  // Parse CNAME records
  const cnameRecords = [];
  const cnameLines = cnameOutput.split("\n");
  let inCnameAnswer = false;
  let foundCnameSection = false;
  for (const line of cnameLines) {
    const lower = line.toLowerCase();
    if (lower.includes("non-authoritative answer") || lower.includes("authoritative answer")) {
      inCnameAnswer = true;
      foundCnameSection = true;
      continue;
    }
    if (!foundCnameSection) continue;
    const match = line.match(/canonical name\s*=\s*(\S+)/i);
    if (match) cnameRecords.push(match[1].replace(/\.$/, ""));
  }

  return { nameservers, aRecords, cnameRecords };
}

async function queryRDAP(domain) {
  try {
    const tld = domain.split(".").pop();
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { "User-Agent": "HandoffEvidenceTool/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { error: `RDAP query failed (HTTP ${res.status})` };
    const data = await res.json();

    const registrar = data.entities?.find((e) =>
      e.roles?.includes("registrar")
    );
    const registrarName = registrar?.vcardArray?.[1]?.find(
      (v) => v[0] === "fn"
    )?.[3];

    const nameservers =
      data.nameservers?.map((ns) => ns.ldhName?.toLowerCase()) || [];

    const events = data.events || [];
    const created = events.find((e) => e.eventAction === "registration")?.eventDate;
    const expires = events.find((e) => e.eventAction === "expiration")?.eventDate;

    // Privacy detection: check if registrant info is redacted
    const hasPrivacy = !registrarName ||
      data.status?.some(s => s.includes("redacted")) ||
      (data.entities && data.entities.every(e => !e.vcardArray));

    return {
      registrarName: registrarName || "(not available)",
      privacyProtected: hasPrivacy,
      created,
      expires,
      nameservers,
      statuses: data.status || [],
    };
  } catch (e) {
    return { error: `RDAP query failed: ${e.message}` };
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Same-origin only: reflect the Origin header ONLY when it matches an
  // expected loopback origin. Never emit a wildcard ACAO.
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Mutating endpoints must come from the same origin. Reject foreign/absent
  // Origin so a cross-site page cannot drive /api/dns-check or /api/save-review.
  const isMutatingApi = pathname === "/api/save-review" || pathname === "/api/dns-check";
  if (isMutatingApi && !isAllowedOrigin(origin)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden: cross-origin request rejected" }));
    return;
  }

  // API: Domain/DNS check
  if (pathname === "/api/dns-check" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      const domain = body.domain?.trim();
      if (!domain || !/^[a-zA-Z0-9][a-zA-Z0-9.-]+$/.test(domain)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid domain" }));
        return;
      }

      const [dns, rdap] = await Promise.all([
        Promise.resolve(queryDNS(domain)),
        queryRDAP(domain),
      ]);

      const signals = [];
      if (dns.nameservers.length > 0) {
        signals.push(`Nameservers: ${dns.nameservers.join(", ")}`);
      }
      if (rdap.registrarName && rdap.registrarName !== "(not available)") {
        signals.push(`Registrar: ${rdap.registrarName}`);
      }
      if (rdap.privacyProtected) {
        signals.push("WHOIS is privacy-protected — ownership cannot be confirmed from public data alone.");
      }
      if (dns.aRecords.length > 0) {
        signals.push(`A records: ${dns.aRecords.join(", ")}`);
      }
      if (dns.cnameRecords.length > 0) {
        signals.push(`CNAME: ${dns.cnameRecords.join(", ")}`);
      }
      if (dns.nameservers.length === 0 && dns.aRecords.length === 0) {
        signals.push("No DNS records found for this domain.");
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ domain, dns, rdap, signals }));
    } catch (e) {
      res.writeHead(e.statusCode || 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API: Save review data
  if (pathname === "/api/save-review" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      const outPath = join(ROOT, "saved-review.json");
      writeFile(outPath, JSON.stringify(body, null, 2), () => {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(e.statusCode || 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static file serving
  let filePath;
  if (pathname === "/" || pathname === "/index.html") {
    filePath = join(ROOT, "workspace.html");
  } else if (pathname === "/favicon.ico") {
    // Return empty 204 for favicon to avoid 404 noise
    res.writeHead(204);
    res.end();
    return;
  } else if (pathname.startsWith("/data/")) {
    // Serve sample data files
    const dataFile = pathname.replace("/data/", "");
    filePath = join(ROOT, dataFile);
  } else {
    filePath = join(ROOT, pathname);
  }

  serveFile(res, filePath);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Handoff Evidence Internal Tool`);
  console.log(`Workspace: http://localhost:${PORT}`);
  console.log(`Server PID: ${process.pid}`);
  console.log(`Bound to 127.0.0.1 only; cross-origin requests to the API are rejected.`);
});
