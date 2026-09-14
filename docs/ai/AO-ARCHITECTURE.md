# AO orchestration architecture

The platform uses four control layers:

1. Governance: `AGENTS.md` defines durable invariants.
2. Capability: native OpenCode skills provide reusable procedures and are indexed by `AO-SKILL-CATALOG.json`.
3. Execution: one lead, three specialized orchestrators, and at most six leaf workers use enforced OpenCode v2 permissions.
4. State: `AO-TASK-REGISTRY.json`, atomic leases, write scopes, Git, tests, and PR evidence determine state.

```text
ao-lead
|- ao-recovery-orchestrator
|  `- ao-recovery-worker
|- ao-implementation-orchestrator
|  |- ao-frontend-worker
|  `- ao-backend-worker
`- ao-verification-orchestrator
   |- ao-qa-reviewer
   `- ao-security-reviewer
```

OpenCode v2 `permissions` rules deny broad `subagent` use and then allow only each orchestrator's declared children. Every leaf has a final deny rule for all subagents. Reviewers also deny all edits. The effective configuration is verified with `opencode debug agents`.

AO currently exposes one native project orchestrator. The three specialized orchestrators therefore run as bounded OpenCode subagents or AO worker-supervisors, while the native session remains the lead. This is an implementation constraint, not a reason to create multiple logical tasks.

## Scheduling

`scripts/ao/orchestrator.mjs` owns atomic registry mutations. It admits a task only when the task is `READY`, dependencies are terminal, no valid lease exists, write scopes do not overlap, and capacity is available. Runtime heartbeat and meaningful progress are distinct records. Lease transfer increments `lease_generation` on the same task.

The Kanban board must project deterministic registry predicates. `Awaiting PR` is invalid unless a real PR URL/state exists. Provider failure changes the lease owner/model and records evidence; it never creates a card.

## Pull requests

The canonical lifecycle is `DISCOVERED -> READY -> LEASED -> BUILDING -> LOCAL_VERIFIED -> DRAFT_PR_OPEN -> VALIDATING -> CHANGES_REQUESTED -> BUILDING -> LOCAL_VERIFIED -> VALIDATING -> READY_TO_MERGE -> MERGED -> CLOSED`.

Until GitHub authentication is available to AO, a locally verified task that cannot create a PR enters `BLOCKED_EXTERNAL_PR` exactly once. Independent tasks may continue.
