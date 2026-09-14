#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.env.AO_REPO||process.cwd();
const base=path.join(root,'.agents','skills');
const output=path.join(root,'docs','ai','AO-SKILL-CATALOG.json');
const disabled=new Set(['claude-handoff','git-guardrails-claude-code','migrate-to-shoehorn','scaffold-exercises','smithery-ai-cli','smithery-homepage','writing-beats','writing-fragments','writing-shape']);
const enabled=new Set(['anti-slop','code-review','diagnosing-bugs','elegant-design','frontend-design','implement','research','resolving-merge-conflicts','tdd','web-design-reviewer','webapp-testing','writing-for-agents','ao-orchestration-governance','ao-worktree-recovery','ao-task-execution','ao-pr-validation']);
const orchestration=new Set(['ao-orchestration-governance','ao-worktree-recovery','ao-task-execution','ao-pr-validation']);
const roleMap={
  'ao-orchestration-governance':['ao-lead'],
  'ao-worktree-recovery':['ao-recovery-orchestrator','ao-recovery-worker'],
  'ao-task-execution':['ao-implementation-orchestrator','ao-frontend-worker','ao-backend-worker'],
  'ao-pr-validation':['ao-verification-orchestrator','ao-qa-reviewer','ao-security-reviewer'],
  'frontend-design':['ao-frontend-worker'],'elegant-design':['ao-frontend-worker'],'anti-slop':['ao-frontend-worker'],
  'webapp-testing':['ao-frontend-worker','ao-qa-reviewer','ao-verification-orchestrator'],
  'code-review':['ao-backend-worker','ao-qa-reviewer','ao-security-reviewer','ao-verification-orchestrator'],
  'diagnosing-bugs':['ao-frontend-worker','ao-backend-worker','ao-security-reviewer','ao-verification-orchestrator'],
  'resolving-merge-conflicts':['ao-recovery-orchestrator','ao-recovery-worker'],
  'tdd':['ao-frontend-worker','ao-backend-worker'],'research':['ao-lead','ao-recovery-orchestrator','ao-implementation-orchestrator']
};
const domains=(id)=> id.startsWith('ao-')?['orchestration'] : id.includes('frontend')||id.includes('design')||id.includes('webapp')?['frontend'] : id.includes('git')||id.includes('merge')||id.includes('handoff')?['git','recovery'] : id.includes('review')||id.includes('test')||id==='tdd'?['verification'] : id.includes('writing')?['documentation'] : ['general-engineering'];
const entries={}; const findings=[];
for(const dir of fs.readdirSync(base,{withFileTypes:true}).filter((e)=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){
  const id=dir.name,file=path.join(base,id,'SKILL.md'); if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8'); const fm=text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/); const header=fm?.[1]||'';
  const name=header.match(/^name:\s*["']?([^\r\n"']+)/m)?.[1]?.trim()||null;
  const description=header.match(/^description:\s*(?:[>|][-+]?\s*)?([^\r\n]*)/m)?.[1]?.trim()||'';
  const unknown=[...header.matchAll(/^([a-zA-Z0-9_-]+):/gm)].map((m)=>m[1]).filter((k)=>!['name','description','license','compatibility','metadata'].includes(k));
  const links=[...text.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)]+)\)/g)].map((m)=>m[1]).filter((p)=>!/[<{]/.test(p));
  const missing=links.filter((p)=>!fs.existsSync(path.resolve(path.dirname(file),p.split('#')[0])));
  const status=missing.length>0||disabled.has(id)?'disabled':enabled.has(id)?'active':'conditional';
  const currentValidity=(name===id&&description.length>0&&missing.length===0)?(unknown.length?'valid_with_ignored_metadata':'valid'):'warning';
  if(unknown.length||missing.length||name!==id||!description) findings.push({skill_id:id,unknown_frontmatter_keys:unknown,missing_references:missing,name_matches_directory:name===id,description_present:description.length>0});
  entries[id]={path:path.relative(root,file).replaceAll('\\','/'),name,description,domain:domains(id),task_types:orchestration.has(id)?['orchestration-control']:['implementation','review'],allowed_roles:roleMap[id]||[],required_for:[],triggers:[],conflicts:disabled.has(id)?['ao-managed-execution']:[],dependencies:links,status,current_validity:currentValidity,last_modified:fs.statSync(file).mtime.toISOString(),sha256:crypto.createHash('sha256').update(text).digest('hex')};
}
const catalog={schema_version:1,generated_at:new Date().toISOString(),source:'.agents/skills/*/SKILL.md',loading_policy:'Select the minimum task-declared skill set; record every additional skill and reason.',skill_count:Object.keys(entries).length,skills:entries,audit_findings:findings};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(catalog,null,2)}\n`);console.log(`Wrote ${catalog.skill_count} skills; ${findings.length} need review.`);
