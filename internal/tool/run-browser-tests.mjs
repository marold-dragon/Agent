#!/usr/bin/env node
/**
 * Browser E2E harness runner.
 *
 * Starts server.js on an ephemeral loopback port, waits for readiness,
 * runs test-browser.js against it with BASE set, then tears the server
 * down. Works on a clean checkout with no hardcoded ports or absolute
 * paths.
 *
 * Env overrides:
 *   PORT       - use this port instead of an ephemeral one (server + tests)
 *   BASE       - skip spawning a server; test an already-running server
 */
import { spawn } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const SERVER = join(TOOL_DIR, "server.js");
const TESTS = join(TOOL_DIR, "test-browser.js");

function run(cmd, args, env, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
      process.stderr.write(d);
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolvePromise(out);
      else reject(new Error(`exit code=${code} signal=${signal}`));
    });
  });
}

async function main() {
  // If BASE is provided externally, test the already-running server as-is.
  if (process.env.BASE) {
    console.log(`Using external server at ${process.env.BASE}`);
    await run(process.execPath, [TESTS], {}, TOOL_DIR);
    return;
  }

  // Pick a port: PORT env if set, otherwise let the OS choose (port 0 trick).
  const requested = process.env.PORT;
  let port = requested ? parseInt(requested, 10) : 0;
  let server;

  const { createServer } = await import("node:http");
  // Probe with a placeholder server to obtain a free port when not pinned.
  if (!port) {
    await new Promise((res, rej) => {
      const probe = createServer();
      probe.on("error", rej);
      probe.listen(0, "127.0.0.1", () => {
        port = probe.address().port;
        probe.close(res);
      });
    });
  }

  const BASE = `http://localhost:${port}`;
  console.log(`Starting server on ${BASE} ...`);
  server = spawn(process.execPath, [SERVER], {
    cwd: TOOL_DIR,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
    windowsHide: true,
  });

  try {
    // Wait for readiness (up to ~10s)
    const deadline = Date.now() + 10000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(BASE);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!ready) throw new Error(`Server did not become ready at ${BASE}`);
    console.log("Server ready. Running browser E2E tests...\n");

    await run(process.execPath, [TESTS], { BASE }, TOOL_DIR);
  } finally {
    if (server && !server.killed) {
      server.kill();
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
