---
name: ao-orchestration-governance
description: Route and reconcile AO tasks from the canonical registry; use for scheduling, leases, duplicate prevention, role boundaries, model fallback, and PR state transitions. Do not use for product implementation.
compatibility: opencode
---

# AO orchestration governance

1. Read `AGENTS.md` and `docs/ai/AO-TASK-REGISTRY.json`.
2. Search registry, sessions, branches, worktrees, commits, and PRs before creating a task.
3. Compute one logical fingerprint from goal, type, domain, scope, acceptance criteria, issue, and PR.
4. Dispatch only a `READY` task through `node scripts/ao/orchestrator.mjs acquire TASK_ID SESSION`.
5. Treat runtime heartbeat and meaningful progress as separate events.
6. Keep the same task, branch, worktree, and PR through review fixes or model fallback.
7. Record exact evidence. Never create model-probe cards or infer progress from the board alone.

Output: task decision, selected role, lease result, skill set, state predicate, and evidence reference.
