import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-dispatch-'));
const repo = process.cwd();
const registry = {
  schema_version: 1,
  policy: { max_leaf_workers: 6 },
  tasks: [{
    task_id: 'AO-901', title: 'dispatch fixture', goal: 'prove loop selection', task_type: 'test', domain: ['test'], status: 'READY', priority: 'high',
    owner_orchestrator: 'ao-implementation-orchestrator', worker_session: null, required_skills: [], recommended_skills: [], forbidden_skills: [],
    branch: 'ao/ao-901', worktree: null, owned_files: ['fixture.txt'], owned_directories: [], readonly_scope: [], dependencies: [], acceptance_criteria: ['pass'], required_tests: ['test'], completion_predicates: ['done'],
    lease: null, lease_generation: 0, latest_commit: null, pr: null, blocker: null, evidence: [], supersedes: [], duplicate_of: null, last_runtime_heartbeat: null, last_meaningful_progress: null
  }]
};
const registryPath = path.join(temp, 'registry.json');
fs.writeFileSync(registryPath, JSON.stringify(registry));
const result = spawnSync(process.execPath, [path.join(repo, 'scripts', 'ao', 'dispatch-loop.mjs'), '--once', '--dry-run'], { cwd: repo, encoding: 'utf8', env: { ...process.env, AO_REPO: repo, AO_REGISTRY: registryPath } });
assert.equal(result.status, 0, result.stderr);
assert.match(result.stdout, /AUTO_LOOP_START/);
assert.match(result.stdout, /AUTO_DISPATCH/);
const updated = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
assert.equal(updated.tasks[0].status, 'LEASED');
assert.equal(updated.tasks[0].worker_session, 'ao-auto-ao-901');
console.log('AO dispatch loop regression test passed.');
