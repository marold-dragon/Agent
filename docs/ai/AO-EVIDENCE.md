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
