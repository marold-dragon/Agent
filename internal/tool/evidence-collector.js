#!/usr/bin/env node

/**
 * Modul A — CLI Evidence Collector
 *
 * Runs locally on the customer's machine. Collects evidence for 12 canonical
 * checklist items and writes evidence.json locally. NEVER sends data anywhere
 * automatically — the customer decides how to transmit evidence.json.
 *
 * Usage: node evidence-collector.js [--output path/to/evidence.json]
 */

import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

// ── Canonical 12 items ──────────────────────────────────────────────────────
// Categories and items match 02-evidence-checklist-and-sample-report.md exactly.

const CATEGORIES = [
  {
    name: "A. Ownership and Control",
    items: [
      { id: "repo-control", label: "Repository control" },
      { id: "domain-dns-control", label: "Domain / DNS control" },
      { id: "hosting-control", label: "Hosting / deployment platform control" },
      { id: "database-control", label: "Database control" },
      { id: "other-services", label: "Other operational services" },
    ],
  },
  {
    name: "B. Reproducibility",
    items: [
      { id: "clean-install", label: "Clean install" },
      { id: "production-build", label: "Production build" },
      { id: "env-var-docs", label: "Environment-variable documentation" },
    ],
  },
  {
    name: "C. Operations",
    items: [
      { id: "deployment", label: "Deployment procedure" },
      { id: "rollback", label: "Rollback procedure" },
      { id: "data-recovery", label: "Data-recovery procedure" },
    ],
  },
  {
    name: "D. Known Manual Dependencies",
    items: [
      {
        id: "known-issues",
        label: "Known issues / manual processes",
      },
    ],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items);

// ── Helpers ─────────────────────────────────────────────────────────────────

function createReader() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askMultiline(rl, prompt, terminator = "") {
  return new Promise((resolve) => {
    console.log(prompt);
    if (terminator) {
      console.log(`  (type "${terminator}" on its own line when done)\n`);
    } else {
      console.log("  (press Enter twice to finish)\n");
    }
    const lines = [];
    let emptyCount = 0;
    rl.on("line", (line) => {
      if (terminator && line.trim() === terminator) {
        rl.removeAllListeners("line");
        resolve(lines.join("\n"));
        return;
      }
      if (!terminator && line.trim() === "") {
        emptyCount++;
        if (emptyCount >= 2) {
          rl.removeAllListeners("line");
          resolve(lines.join("\n"));
          return;
        }
      } else {
        emptyCount = 0;
      }
      lines.push(line);
    });
  });
}

// ── Scan environment variable names from common config files ─────────────────

function scanEnvVarNames(projectDir) {
  const patterns = [
    "package.json",
    ".env.example",
    ".env.local.example",
    ".env.sample",
    ".env.template",
    ".env",
    "wrangler.toml",
    "wrangler.jsonc",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "nuxt.config.js",
    "nuxt.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Dockerfile",
  ];

  const found = new Set();

  for (const file of patterns) {
    try {
      const fullPath = join(projectDir, file);
      if (!existsSync(fullPath)) continue;
      const content = readFileSync(fullPath, "utf8");
      if (!content) continue;

      // Match patterns like process.env.VARIABLE_NAME or env: VARIABLE_NAME
      const envMatches = content.matchAll(
        /(?:process\.env\.|env:\s*|ENV\s+)([A-Z_][A-Z0-9_]*)/g
      );
      for (const m of envMatches) {
        found.add(m[1]);
      }

      // Match ${VARIABLE_NAME} references (common in docker-compose, .env)
      const dollarMatches = content.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
      for (const m of dollarMatches) {
        found.add(m[1]);
      }

      // Match KEY=value lines in .env / .env.example files (no prefix)
      if (file.startsWith(".env")) {
        const envFileMatches = content.matchAll(/^([A-Z_][A-Z0-9_]*)\s*=/gm);
        for (const m of envFileMatches) {
          found.add(m[1]);
        }
      }
    } catch {
      // File doesn't exist or can't be read — skip silently
    }
  }

  return [...found].sort();
}

// ── Run install + build capture ─────────────────────────────────────────────

function runCommand(command, cwd) {
  const start = Date.now();
  try {
    const output = execSync(command, {
      encoding: "utf8",
      timeout: 300_000, // 5 min max
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      command,
      exitCode: 0,
      durationMs: Date.now() - start,
      outputPreview: output.slice(0, 2000), // Non-sensitive, truncated
    };
  } catch (err) {
    return {
      command,
      exitCode: err.status || 1,
      durationMs: Date.now() - start,
      outputPreview: (err.stdout || "").slice(0, 2000),
      error: (err.stderr || "").slice(0, 2000),
    };
  }
}

// ── Main collection flow ────────────────────────────────────────────────────

async function main() {
  const rl = createReader();

  // Parse --output flag
  const outputIdx = process.argv.indexOf("--output");
  const outputArg = outputIdx !== -1 && process.argv[outputIdx + 1]
    ? process.argv[outputIdx + 1]
    : "evidence.json";
  const outputPath = resolve(outputArg);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Handoff Evidence Collector v1.0");
  console.log("  This tool runs locally and does NOT send data anywhere.");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const evidence = {
    meta: {
      toolVersion: "1.0.0",
      collectedAt: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
    },
    projectInfo: {},
    categories: {},
  };

  // ── Project info ──────────────────────────────────────────────────────────
  console.log("── Project Information ──\n");
  evidence.projectInfo.name = await ask(rl, "  Project name: ");
  evidence.projectInfo.repoUrl = await ask(
    rl,
    "  Repository URL (or local path): "
  );
  evidence.projectInfo.projectDir = await ask(
    rl,
    "  Project directory to scan (absolute path, or . for current): "
  );
  const projectDir = resolve(evidence.projectInfo.projectDir || ".");

  // ── Ownership matrix ──────────────────────────────────────────────────────
  console.log("\n── Ownership Matrix ──\n");
  console.log(
    "  For each service below, who controls the account/ownership?\n"
  );

  const ownershipQuestions = [
    { id: "repo", label: "Repository (GitHub/GitLab/etc.)" },
    { id: "domain", label: "Domain registrar" },
    { id: "dns", label: "DNS provider" },
    { id: "hosting", label: "Hosting / deployment (Vercel/Netlify/etc.)" },
    { id: "database", label: "Database (Supabase/PlanetScale/etc.)" },
    { id: "other", label: "Other operational services" },
  ];

  const ownershipMatrix = {};
  for (const q of ownershipQuestions) {
    const answer = await ask(
      rl,
      `  ${q.label} — owner name (or "unknown"): `
    );
    ownershipMatrix[q.id] = answer || "unknown";
  }
  evidence.projectInfo.ownershipMatrix = ownershipMatrix;

  // ── B. Reproducibility: Automated captures ────────────────────────────────
  console.log(
    "\n── B. Reproducibility — Automated Capture ──\n"
  );

  // Detect install command
  const installCmd = await ask(
    rl,
    "  Install command (e.g. npm install, pnpm install, yarn install): "
  );
  const buildCmd = await ask(
    rl,
    "  Build command (e.g. npm run build, pnpm build): "
  );

  let installResult = null;
  let buildResult = null;

  if (installCmd) {
    console.log(`\n  Running: ${installCmd} ...`);
    installResult = runCommand(installCmd, projectDir);
    console.log(
      `  Exit code: ${installResult.exitCode} (${installResult.durationMs}ms)`
    );
  }

  if (buildCmd) {
    console.log(`\n  Running: ${buildCmd} ...`);
    buildResult = runCommand(buildCmd, projectDir);
    console.log(
      `  Exit code: ${buildResult.exitCode} (${buildResult.durationMs}ms)`
    );
  }

  // Scan env var names
  console.log("\n  Scanning for environment variable names...");
  const envVarNames = scanEnvVarNames(projectDir);
  console.log(`  Found ${envVarNames.length} variable name(s): ${envVarNames.join(", ") || "(none)"}`);

  // ── Collect evidence per category ─────────────────────────────────────────
  for (const category of CATEGORIES) {
    evidence.categories[category.name] = {};
    console.log(`\n── ${category.name} ──\n`);

    for (const item of category.items) {
      // Pre-fill reproducibility items from automated capture
      if (item.id === "clean-install" && installResult) {
        console.log(
          `  ${item.label}: [automated] exit=${installResult.exitCode}`
        );
        evidence.categories[category.name][item.id] = {
          label: item.label,
          automated: true,
          exitCode: installResult.exitCode,
          command: installResult.command,
          durationMs: installResult.durationMs,
          outputPreview: installResult.outputPreview,
          notes: "",
        };
        const notes = await ask(rl, "  Additional notes (or Enter to skip): ");
        evidence.categories[category.name][item.id].notes = notes;
        continue;
      }

      if (item.id === "production-build" && buildResult) {
        console.log(
          `  ${item.label}: [automated] exit=${buildResult.exitCode}`
        );
        evidence.categories[category.name][item.id] = {
          label: item.label,
          automated: true,
          exitCode: buildResult.exitCode,
          command: buildResult.command,
          durationMs: buildResult.durationMs,
          outputPreview: buildResult.outputPreview,
          notes: "",
        };
        const notes = await ask(rl, "  Additional notes (or Enter to skip): ");
        evidence.categories[category.name][item.id].notes = notes;
        continue;
      }

      if (item.id === "env-var-docs") {
        evidence.categories[category.name][item.id] = {
          label: item.label,
          automated: true,
          envVarNames,
          notes: "",
        };
        console.log(`  ${item.label}: [automated] ${envVarNames.length} name(s) scanned`);
        const notes = await ask(rl, "  Additional notes (or Enter to skip): ");
        evidence.categories[category.name][item.id].notes = notes;
        continue;
      }

      // Manual items
      console.log(
        `  ${item.label}: describe evidence or status (multi-line):`
      );
      const evidence_text = await askMultiline(rl, "", "DONE");
      evidence.categories[category.name][item.id] = {
        label: item.label,
        automated: false,
        evidence: evidence_text,
        notes: "",
      };
    }
  }

  // ── Write output ──────────────────────────────────────────────────────────
  writeFileSync(outputPath, JSON.stringify(evidence, null, 2), "utf8");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Evidence written to: ${outputPath}`);
  console.log(
    "  This file was NOT sent anywhere. You decide how to transmit it."
  );
  console.log("═══════════════════════════════════════════════════════════════\n");

  rl.close();
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
