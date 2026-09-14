# AO recovery evidence

## Forensic facts

- AO database snapshot: `C:/Users/Lenovo/.ao/data/snapshots/20260914-100457/ao.db` (local only, not committed).
- Audit found 49 sessions: one project orchestrator and 48 workers. Historical PR, review, and check tables were empty.
- Local `checkpoint/internal-tool-ao` was ten commits ahead of its remote at audit time.
- Historical patches were reconciled through `397eac5`; `npm test` passed 72 checks and `npm run test:browser` passed 27 checks on that chain.
- `17a74309` is the only historical commit not patch-equivalent to the canonical chain. Its branch/worktree remains preserved.
- Root dirty product output, screenshots, security probes, and launcher files remain untouched.

## Credential handling

- `OPENAGENTIC_API_KEY` exists at User scope. The value is never printed or stored in this repository.
- Direct `/models` previously returned HTTP 200, minimal OpenCode inference passed, and AO-context inference passed using file-backed authorization headers.
- A stale orchestrator worktree contained an inline key. Only its SHA-256/size/status were recorded in the protected local snapshot directory; the dirty file was reset and a follow-up scan found no inline key.

## Platform verification

- `node scripts/ao/orchestrator.test.mjs` covers overlapping scopes, duplicate ownership, evidence-gated transitions, and same-task lease transfer.
- `node scripts/ao/orchestrator.mjs validate` checks registry invariants, required agent topology, leaf spawn denial, reviewer edit denial, and skill structure.
- `opencode debug agents` is the authority for effective v2 permissions; source JSON alone is insufficient.
- Both PowerShell integration scripts parse with zero errors and contain only ASCII.

## Model health at remediation time

- `openagentic/deepseek-v4.1-flash`: minimal inference passed and is the active lead/implementation model.
- `openagentic/gemini-3.8-flash-high`: minimal inference passed and is the active verification/frontend model.
- `openagentic/claude-sonnet-4.6`: transient provider HTTP 503; removed from active routing until a later health probe passes.
- `openagentic/qwen3.8-flash-free`: upstream 502/connection refused; removed from active routing until a later health probe passes.
- These probes are infrastructure evidence only and created no Kanban tasks.

## Draft PR lifecycle

GitHub CLI was installed outside PATH and was found at `C:/Program Files/GitHub CLI/gh.exe`. Its keyring session had repository access. Branch `ao/platform-recovery` was pushed and Draft PR #1 was opened against `checkpoint/internal-tool-ao`; AO-002 was closed without creating a replacement task.

`C:/Program Files/GitHub CLI` was added to the User PATH. The existing keyring token was handed to AO through the User-scoped `AO_GITHUB_TOKEN` without printing it, AO was restarted, and `ao doctor` then reported GitHub PASS.

## Independent validation and reconciliation

- Verification session `new-project-51` validated PR head `b3c97b269f56d109306716721fe9b1c450494740` with zero findings.
- Scheduler failure-mode tests, platform validation, 72 module checks, 27 browser checks, and 47 focused security checks passed.
- GitHub reported PR #1 open and mergeable; no remote checks or reviews are configured.
- Recovery session `new-project-49` verified the bounded native topology and preserved historical worktrees.
- Worker 46's unique effective-port hardening remains preserved on `ao/new-project-46/root` at `9312dec22091d69ad90618b06c7e3029d376b997`.
- Completed AO sessions may be terminated after evidence is recorded; their branches and worktrees remain available for audit.
- PR #1 was promoted from Draft to ready for review after the independent validation passed. It remains open and unmerged.
- A clean clone of remote `ao/platform-recovery` at `cf013a5` installed its declared dependencies and passed 72 module checks and 27 browser checks, closing the project's fresh-clone reproducibility gate.
