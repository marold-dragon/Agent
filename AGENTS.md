# Repository and orchestration rules

## Source of truth

- Product source lives in `internal/tool/`; generated browser output lives in `dist/`.
- Canonical orchestration state is `docs/ai/AO-TASK-REGISTRY.json`.
- `docs/ai/AO-ORCHESTRATOR-STATE.md` is a human-readable projection, not an authority.
- `docs/ai/AO-EVIDENCE.md` records reproduced facts and commands.
- The AO Kanban board is a projection of registry, Git, test, and PR evidence.

## Build and test

Run from `internal/tool`:

```text
npm test
npm run test:browser
npm start
```

A task may enter `LOCAL_VERIFIED` only after every `required_tests` command passes and the result is recorded in its evidence. Local HTTP acceptance requires `http://127.0.0.1:<port>/` to return 200.

## Orchestration invariants

- Use one canonical `TASK_ID` for one logical objective. Retries, model fallback, review fixes, and worker replacement keep the same task and PR.
- Dispatch only a `READY` task with satisfied dependencies, no valid lease, a free write scope, and available capacity.
- One task has at most one active execution lease. A transfer increments its generation.
- Coding workers and reviewers are leaf agents. Their OpenCode `permission.task` is denied.
- Review findings return to the same implementation task and same PR.
- Do not infer progress from process activity. Record meaningful progress as a diff, commit, test, PR, resolved dependency, or fixed finding.
- Provider health checks are infrastructure events and never create Kanban tasks.
- Maximum live topology is one lead, three specialized orchestrators, and six leaves.

## Branch, worktree, and PR lifecycle

- Branch names use `ao/<TASK_ID-lowercase>-<slug>`.
- Coding work runs in an isolated worktree when AO supports it.
- Before removing a worktree, inspect status, untracked files, commits, and patch equivalence.
- A local commit is a checkpoint. Locally verified changes must be pushed and attached to one Draft PR before validation.
- If push or PR creation is unavailable, set `BLOCKED_EXTERNAL_PR` with exact evidence. Do not spawn a replacement.

## Safety and ownership

- Never print, commit, copy into prompts, or persist provider secrets in repository or AO state.
- Never discard dirty worktrees or unique commits without preservation.
- Do not run concurrent writers whose `owned_files` or `owned_directories` overlap.
- Avoid destructive Git operations. Do not deploy, merge, or publish without an explicit owner request.
- Skills are loaded on demand from the capability catalog. Each task records required, recommended, forbidden, and actually loaded skills.
