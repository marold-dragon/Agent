#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.env.AO_REPO || process.cwd();
const registryPath = process.env.AO_REGISTRY || path.join(root, 'docs', 'ai', 'AO-TASK-REGISTRY.json');
const orchestratorPath = path.join(root, 'scripts', 'ao', 'orchestrator.mjs');
const intervalMs = Number(process.env.AO_DISPATCH_INTERVAL_MS || 5000);
const once = process.argv.includes('--once');
const dryRun = process.argv.includes('--dry-run');
const terminal = new Set(['MERGED', 'CLOSED', 'SUPERSEDED']);
const children = new Map();

function stamp() { return new Date().toISOString(); }
function log(event, fields = {}) { console.log(JSON.stringify({ at: stamp(), event, ...fields })); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function scope(item) { return [...(item.owned_files || []), ...(item.owned_directories || [])].map((p) => p.replaceAll('\\', '/').replace(/\/$/, '').toLowerCase()); }
function overlaps(a, b) { return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`); }
function activeLease(item) { return item.lease && Date.parse(item.lease.expires_at) > Date.now(); }
function dependenciesMet(registry, item) { return (item.dependencies || []).every((id) => terminal.has(registry.tasks.find((candidate) => candidate.task_id === id)?.status)); }
function conflicts(registry, item) {
  return registry.tasks.filter((other) => other.task_id !== item.task_id && activeLease(other))
    .some((other) => scope(item).some((a) => scope(other).some((b) => overlaps(a, b))));
}
function eligible(registry) {
  return registry.tasks.filter((item) => item.status === 'READY' && !activeLease(item) && dependenciesMet(registry, item) && !conflicts(registry, item));
}
function modelFor(owner) {
  const config = readJson(path.join(root, 'opencode.json'));
  return config.agents?.[owner]?.model || config.model;
}
function promptFor(item, worker) {
  return [
    `Execute canonical AO task ${item.task_id} autonomously as ${item.owner_orchestrator}.`,
    `Worker session is ${worker}. Read AGENTS.md and ${path.relative(root, registryPath)} before acting.`,
    `Use only the declared scope. Goal: ${item.goal}`,
    `Acceptance criteria: ${item.acceptance_criteria.join(' | ')}`,
    `Required tests: ${item.required_tests.join(' | ')}`,
    'Do not ask the owner for a prompt. Record meaningful progress, exact evidence, and the final registry transition for this same task. Do not create a replacement task, merge, deploy, or publish.'
  ].join('\n');
}
function launch(item) {
  const worker = `ao-auto-${item.task_id.toLowerCase()}`;
  const acquired = spawnSync(process.execPath, [orchestratorPath, 'acquire', item.task_id, worker, '60'], { cwd: root, encoding: 'utf8' });
  if (acquired.status !== 0) { log('AUTO_ACQUIRE_FAILED', { task_id: item.task_id, stderr: acquired.stderr.trim() }); return false; }
  log('AUTO_DISPATCH', { task_id: item.task_id, worker_session: worker, owner_orchestrator: item.owner_orchestrator, model: modelFor(item.owner_orchestrator), lease: acquired.stdout.trim() });
  if (dryRun) return true;
  const command = process.platform === 'win32' ? 'opencode.cmd' : 'opencode';
  const child = spawn(command, ['run', '--agent', item.owner_orchestrator, '--model', modelFor(item.owner_orchestrator), '--auto', '--title', item.title, promptFor(item, worker)], { cwd: root, env: process.env, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  children.set(item.task_id, child);
  child.stdout.on('data', (chunk) => process.stdout.write(`[${item.task_id}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${item.task_id}] ${chunk}`));
  child.on('error', (error) => {
    log('AUTO_AGENT_SPAWN_FAILED', { task_id: item.task_id, worker_session: worker, code: error.code, message: error.message });
    spawnSync(process.execPath, [orchestratorPath, 'release', item.task_id, worker, `Automatic dispatch spawn failed: ${error.code}`], { cwd: root, encoding: 'utf8' });
    children.delete(item.task_id);
  });
  child.on('close', (code, signal) => { children.delete(item.task_id); log('AUTO_AGENT_EXIT', { task_id: item.task_id, worker_session: worker, code, signal }); });
  return true;
}
function tick() {
  const registry = readJson(registryPath);
  const candidate = eligible(registry).find((item) => !children.has(item.task_id));
  if (candidate) launch(candidate); else log('AUTO_IDLE', { ready: eligible(registry).map((item) => item.task_id) });
}

log('AUTO_LOOP_START', { interval_ms: intervalMs, registry: path.relative(root, registryPath), dry_run: dryRun });
tick();
if (!once) setInterval(tick, intervalMs);
