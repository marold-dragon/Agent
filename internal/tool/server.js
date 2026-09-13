/**
 * Handoff Evidence Internal Tool — Local Browser Server
 * Serves the workspace application and provides DNS/RDAP API endpoint.
 * Local-only. No external data sending (Modules A/B).
 */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs";
import { resolve, join, extname } from "node:path";
import { execSync } from "node:child_process";

const PORT = parseInt(process.env.PORT || "3789", 10);
const ROOT = resolve(import.meta.dirname, ".");

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

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

function runNslookup(domain, type) {
  try {
    const result = execSync(`nslookup -type=${type} ${domain} 2>&1`, {
      encoding: "utf8",
      timeout: 10000,
    });
    return result;
  } catch (e) {
    return e.stdout || e.message || "";
  }
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

  // CORS headers for local development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
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
      res.writeHead(500, { "Content-Type": "application/json" });
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
      res.writeHead(500, { "Content-Type": "application/json" });
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
  console.log(`Local-only. No data is sent externally (Modules A/B).`);
});
