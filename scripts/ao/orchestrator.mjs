#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.env.AO_REPO || process.cwd();
const registryPath = process.env.AO_REGISTRY || path.join(root, 'docs', 'ai', 'AO-TASK-REGISTRY.json');
const lockPath = `${registryPath}.lock`;
const allowed = new Set(['DISCOVERED','READY','LEASED','BUILDING','LOCAL_VERIFIED','DRAFT_PR_OPEN','VALIDATING','CHANGES_REQUESTED','READY_TO_MERGE','MERGED','CLOSED','BLOCKED_EXTERNAL_PR','BLOCKED_EXTERNAL','SUPERSEDED']);
const terminal = new Set(['MERGED','CLOSED','SUPERSEDED']);

function die(message) { console.error(`ERROR: ${message}`); process.exitCode = 1; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function writeJson(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}
function now() { return new Date().toISOString(); }
function task(registry, id) { const found = registry.tasks.find((item) => item.task_id === id); if (!found) throw new Error(`Unknown task ${id}`); return found; }
function activeLease(item, at = Date.now()) { return item.lease && Date.parse(item.lease.expires_at) > at; }
function scope(item) { return [...(item.owned_files || []), ...(item.owned_directories || [])].map((p) => p.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()); }
function overlaps(a, b) { return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`); }
function fingerprint(item) {
  const stable = [item.goal,item.task_type,[...(item.domain||[])].sort(),[...scope(item)].sort(),[...(item.acceptance_criteria||[])].sort(),item.pr?.url||''];
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0, 20);
}
function dependenciesMet(registry, item) { return (item.dependencies || []).every((id) => terminal.has(task(registry, id).status)); }
function withLock(action) {
  let fd;
  try { fd = fs.openSync(lockPath, 'wx'); fs.writeFileSync(fd, `${process.pid} ${now()}\n`); }
  catch (error) { if (error.code === 'EEXIST') throw new Error(`Registry lock exists: ${lockPath}`); throw error; }
  try { return action(); } finally { fs.closeSync(fd); fs.unlinkSync(lockPath); }
}
function conflicts(registry, candidate) {
  const own = scope(candidate);
  return registry.tasks.filter((other) => other.task_id !== candidate.task_id && activeLease(other) && own.some((a) => scope(other).some((b) => overlaps(a,b))));
}
function validate(registry) {
  const errors = [];
  const ids = new Set(); const prints = new Map();
  for (const item of registry.tasks) {
    if (!/^AO-[0-9]{3,}$/.test(item.task_id || '')) errors.push(`invalid task_id: ${item.task_id}`);
    if (ids.has(item.task_id)) errors.push(`duplicate task_id: ${item.task_id}`); ids.add(item.task_id);
    if (!allowed.has(item.status)) errors.push(`${item.task_id}: invalid status ${item.status}`);
    const fp = item.fingerprint || fingerprint(item);
    if (prints.has(fp) && !item.duplicate_of && !terminal.has(item.status)) errors.push(`${item.task_id}: logical duplicate of ${prints.get(fp)}`);
    else prints.set(fp, item.task_id);
    if (activeLease(item) && !['LEASED','BUILDING','VALIDATING','CHANGES_REQUESTED'].includes(item.status)) errors.push(`${item.task_id}: active lease incompatible with ${item.status}`);
    if (activeLease(item) && (!item.lease.lease_id || !item.lease.worker_session || !item.lease.generation)) errors.push(`${item.task_id}: incomplete active lease`);
  }
  const leased = registry.tasks.filter((item) => activeLease(item));
  for (let i=0;i<leased.length;i++) for (let j=i+1;j<leased.length;j++) if (scope(leased[i]).some((a)=>scope(leased[j]).some((b)=>overlaps(a,b)))) errors.push(`write-scope conflict: ${leased[i].task_id}/${leased[j].task_id}`);
  if (leased.length > (registry.policy?.max_leaf_workers ?? 6)) errors.push(`active leases exceed max_leaf_workers`);
  return errors;
}
function validateAgents() {
  const config = readJson(path.join(root, 'opencode.json'));
  const agents = config.agents || config.agent || {};
  const required = ['ao-lead','ao-recovery-orchestrator','ao-implementation-orchestrator','ao-verification-orchestrator','ao-recovery-worker','ao-frontend-worker','ao-backend-worker','ao-qa-reviewer','ao-security-reviewer'];
  const errors = required.filter((id) => !agents[id]).map((id) => `missing agent ${id}`);
  for (const id of ['ao-recovery-worker','ao-frontend-worker','ao-backend-worker','ao-qa-reviewer','ao-security-reviewer']) {
    const p = agents[id]?.permission;
    const rules = agents[id]?.permissions || [];
    if (!rules.some((rule) => rule.action === 'subagent' && rule.resource === '*' && rule.effect === 'deny')) errors.push(`${id}: subagent permission must be denied`);
  }
  for (const id of ['ao-qa-reviewer','ao-security-reviewer']) {
    const rules = agents[id]?.permissions || [];
    if (!rules.some((rule) => rule.action === 'edit' && rule.resource === '*' && rule.effect === 'deny')) errors.push(`${id}: edit permission must be denied`);
  }
  return errors;
}
function validateSkills() {
  const base = path.join(root,'.agents','skills');
  if (!fs.existsSync(base)) return ['skills directory missing'];
  const errors=[];
  for (const entry of fs.readdirSync(base,{withFileTypes:true}).filter((e)=>e.isDirectory())) {
    const file=path.join(base,entry.name,'SKILL.md');
    if (!fs.existsSync(file)) { errors.push(`${entry.name}: SKILL.md missing`); continue; }
    const text=fs.readFileSync(file,'utf8'); const block=text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!block) { errors.push(`${entry.name}: invalid frontmatter`); continue; }
    const name=block[1].match(/^name:\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
    const description=block[1].match(/^description:\s*(?:[>|][-+]?\s*)?([^\r\n]*)/m)?.[1]?.trim();
    if (name !== entry.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name || '')) errors.push(`${entry.name}: invalid or mismatched name`);
    if (description === undefined) errors.push(`${entry.name}: description missing`);
  }
  return errors;
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'validate') {
    const errors=[...validate(readJson(registryPath)),...validateAgents(),...validateSkills()];
    if (errors.length) errors.forEach(die); else console.log('AO platform validation passed.');
  } else if (command === 'schedule') {
    const r=readJson(registryPath); const ready=r.tasks.filter((item)=>item.status==='READY'&&!activeLease(item)&&dependenciesMet(r,item)&&conflicts(r,item).length===0);
    console.log(JSON.stringify(ready.map((item)=>({task_id:item.task_id,owner_orchestrator:item.owner_orchestrator,branch:item.branch,required_skills:item.required_skills})),null,2));
  } else if (command === 'acquire') {
    const [id,worker,minutes='30']=args;
    withLock(()=>{const r=readJson(registryPath);const item=task(r,id);if(item.status!=='READY')throw new Error(`${id} is ${item.status}, expected READY`);if(!dependenciesMet(r,item))throw new Error(`${id} dependencies are incomplete`);const blocked=conflicts(r,item);if(blocked.length)throw new Error(`${id} conflicts with ${blocked.map((x)=>x.task_id).join(', ')}`);const generation=(item.lease_generation||item.lease?.generation||0)+1;const at=new Date();item.lease_generation=generation;item.lease={lease_id:crypto.randomUUID(),generation,worker_session:worker,leased_at:at.toISOString(),heartbeat_at:at.toISOString(),expires_at:new Date(at.getTime()+Number(minutes)*60000).toISOString()};item.worker_session=worker;item.status='LEASED';item.last_runtime_heartbeat=at.toISOString();r.updated_at=now();writeJson(registryPath,r);console.log(JSON.stringify(item.lease,null,2));});
  } else if (command === 'heartbeat' || command === 'progress') {
    const [id,worker,note='']=args;
    withLock(()=>{const r=readJson(registryPath);const item=task(r,id);if(!activeLease(item)||item.lease.worker_session!==worker)throw new Error(`${id}: worker does not hold an active lease`);const at=now();item.lease.heartbeat_at=at;item.last_runtime_heartbeat=at;if(command==='progress'){item.last_meaningful_progress=at;item.evidence.push({at,type:'meaningful_progress',detail:note});}r.updated_at=at;writeJson(registryPath,r);console.log(`${command} recorded for ${id}`);});
  } else if (command === 'release') {
    const [id,worker,reason='released']=args;
    withLock(()=>{const r=readJson(registryPath);const item=task(r,id);if(!item.lease||item.lease.worker_session!==worker)throw new Error(`${id}: lease owner mismatch`);item.evidence.push({at:now(),type:'lease_released',detail:reason,generation:item.lease.generation});item.lease=null;item.worker_session=null;if(['LEASED','BUILDING'].includes(item.status))item.status='READY';r.updated_at=now();writeJson(registryPath,r);console.log(`lease released for ${id}`);});
  } else if (command === 'transition') {
    const [id,next]=args;
    withLock(()=>{const r=readJson(registryPath);const item=task(r,id);if(!allowed.has(next))throw new Error(`invalid state ${next}`);if(next==='LOCAL_VERIFIED'&&!(item.evidence||[]).some((e)=>e.type==='tests_passed'))throw new Error(`${id}: tests_passed evidence required`);if(['DRAFT_PR_OPEN','VALIDATING','READY_TO_MERGE'].includes(next)&&!(item.pr?.url&&item.pr?.state))throw new Error(`${id}: PR evidence required`);if(next==='READY_TO_MERGE'&&!(item.evidence||[]).some((e)=>e.type==='validation_passed'))throw new Error(`${id}: validation_passed evidence required`);item.status=next;r.updated_at=now();writeJson(registryPath,r);console.log(`${id}: ${next}`);});
  } else die('Usage: orchestrator.mjs validate|schedule|acquire|heartbeat|progress|release|transition');
} catch (error) { die(error.message); }
