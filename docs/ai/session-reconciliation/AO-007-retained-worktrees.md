# AO-007 retained worktree reconciliation

## Scope and authority

| Field | Value |
|---|---|
| TASK_ID | `AO-007` |
| Task | Reconcile retained AO worktrees |
| Owner orchestrator | `ao-recovery-orchestrator` |
| Worker session | `new-project-52` |
| Session branch | `ao/ao-007-worktree-reconcile` |
| Lease | `c12e60e7-ec19-4163-bb16-0c05fd58b766`, generation 1 |
| Base ref | `checkpoint/internal-tool-ao` @ `9f0e5fd` (audit base) |
| Dependency | `AO-005` (`CLOSED`, satisfied) |
| Audit mode | Read-only inspection of retained worktrees |
| Lease expires | `2026-09-14T05:12:05.320Z` |
| Lease generation | 2 (this commit), superseding generation 1 |
| Manifest revision | 2 — re-validated against live refs |

During generation 2 the base advanced by one commit to `ec59195`
(`docs(audit): record Hermes forensic audit state, evidence, and state-file
tracking`, adding `docs/ai/HERMES-EVIDENCE.md`, `docs/ai/HERMES-STATE.md`, and
`.gitignore` entries). All findings below were re-measured against `ec59195` and
are unchanged: still 3 unique commits, 19 branches ahead of base, 13 worktrees,
and 55 sessions. This manifest pins the original audit base `9f0e5fd` for
traceability and notes the re-validation base `ec59195`.

This audit is read-only. No worktree, branch, commit, stash, or file was deleted,
moved, merged, or published. The only artifact written is this file.

## Disposition

`RECOVERY_DISPOSITION_RECORDED` — all retained worktrees classified, all three
unique commits confirmed preserved on live refs, no worktree deleted.

## Revision note (revision 2)

Revision 1 of this manifest recorded **two** unique commits. A re-validation pass
against live refs found **three**. The third commit appeared after revision 1 was
written, created concurrently by the AO-008 worker session while this audit was
in progress:

- `26d3cb6` — `fix(ao): strip UTF-8 BOM from failover runner and document runtime handoff`
- committed `2026-09-14T11:39:52+07:00`, six seconds before revision 1 was saved
  (`2026-09-14T11:39:58`)
- held by `ao/ao-008-runtime-handoff`, the branch of the live session `new-project-53`

Revision 1's unique-commit count was accurate when measured and became stale
almost immediately. The count is not a fixed property of the repository while
other sessions hold active leases — it is a snapshot. This revision records the
current state and states the snapshot boundary explicitly.

The new commit is also the resolution of the one dirty file revision 1 flagged in
`new-project-53`: `run-ui-autonomous-failover.ps1` was committed by its own
session, and that worktree is now clean. Revision 1 correctly left that file
untouched; AO-008 completed it independently.

## Required test evidence

| Required test | Command run | Result |
|---|---|---|
| `ao session ls --all` | `ao session ls --all --include-terminated --json` | PASS — 55 sessions: 4 live, 51 terminated |
| `git worktree list` | `git worktree list` | PASS — 13 registered worktrees |
| `git status per retained worktree` | `git status --porcelain` per worktree | PASS — 13 worktrees inspected |

Live (non-terminated) sessions observed:

| Session | Role | Status | Branch |
|---|---|---|---|
| `new-project-1` | orchestrator | working | `ao/new-project-orchestrator` |
| `new-project-52` | worker | working | `ao/ao-007-worktree-reconcile` |
| `new-project-53` | worker | working | `ao/ao-008-runtime-handoff` |
| `new-project-54` | worker | mergeable | `ao/ao-009-current-pr-validation` |

## Worktree inventory

13 worktrees are registered. All 13 were inspected.

| # | Worktree | Branch | HEAD | Working-tree state |
|---|---|---|---|---|
| 1 | `D:/New Project` | `checkpoint/internal-tool-ao` | `9f0e5fd` | DIRTY — 6 modified, 3 untracked |
| 2 | `.../new-project-23` | `ao/new-project-23/root` | `cb0838c` | untracked `internal/tool/tests/screenshots/` |
| 3 | `.../new-project-25` | `qa-integration` | `17a7430` | untracked `internal/tool/tests/screenshots/` |
| 4 | `.../new-project-29` | `fix-browser-report` | `2b5c57a` | untracked `internal/tool/tests/screenshots/` |
| 5 | `.../new-project-30` | `ao/new-project-30/fix-integration` | `d304cb7` | untracked `internal/tool/tests/screenshots/` |
| 6 | `.../new-project-35` | `secheck` | `d304cb7` | untracked `internal/tool/tests/secheck/` |
| 7 | `.../new-project-46` | `ao/new-project-46/root` | `9312dec` | clean — holds unique commit |
| 8 | `.../new-project-51` | `ao/platform-recovery` | `3b4b676` | clean |
| 9 | `.../new-project-52` | `ao/ao-007-worktree-reconcile` | `9f0e5fd` | clean — this audit session |
| 10 | `.../new-project-53` | `ao/ao-008-runtime-handoff` | `26d3cb6` | clean — holds unique commit |
| 11 | `.../new-project-54` | `ao/ao-009-current-pr-validation` | `9f0e5fd` | clean |
| 12 | `.../orchestrator/new-project-orchestrator` | `ao/new-project-orchestrator` | `9f0e5fd` | clean |
| 13 | `D:/New Project/work/ao-reconcile` | `ao/reconcile-kanban` | `397eac5` | clean |

No worktree holds a git stash (`git stash list` empty in all 13).

## Unique commit analysis

19 local branches carry commits not reachable from the base. Each was tested with
`git cherry -v <base> <branch>` to separate genuinely unique work (`+`) from
patches already present upstream (`-`).

**Result: three commits are genuinely unique** as of this revision. Every other
ahead-commit is patch-equivalent to content already in `checkpoint/internal-tool-ao`.

### Unique commit 1 — `9312dec22091d69ad90618b06c7e3029d376b997`

| Field | Value |
|---|---|
| Subject | `fix(tool): preserve effective-port origin hardening` |
| Branch | `ao/new-project-46/root` |
| Worktree | `.../new-project-46` |
| Patch-id | `0b48e0d0b3c3e3f11028703b82d3e46cbe2c1c2b` |
| Reachable from base | No |
| Reachable from PR #1 head | No |
| Present on `origin` | No |

Held only by `ao/new-project-46/root`. This is the effective-port patch already
recorded as preserved by AO-005; this audit independently re-confirms it is still
live and not yet integrated.

### Unique commit 2 — `17a74309bc80ff00d18da95893da4b86c82646b2`

| Field | Value |
|---|---|
| Subject | `test(qa): add end-to-end browser QA scripts and measured results` |
| Branch | `qa-integration` |
| Worktree | `.../new-project-25` |
| Patch-id | `6c12c561f77060fa75cc1893ff2e49bf4ad3b36d` |
| Reachable from base | No |
| Reachable from PR #1 head | No |
| Present on `origin` | No |

Held only by `qa-integration`. AO-004 previously recorded a `SUPERSEDED`
disposition for this commit (unwired fixed-port QA harness plus stale measured
JSON, with the maintained browser suite covering the canonical checks). This
audit re-confirms the commit still exists on its preserved ref and that no
integration or deletion occurred. The AO-004 classification is unchanged; it is
a preserved artifact, not pending merge work.

### Unique commit 3 — `26d3cb655374307d30b0afe9ed48bde5ea71aff3`

| Field | Value |
|---|---|
| Subject | `fix(ao): strip UTF-8 BOM from failover runner and document runtime handoff` |
| Author | Codex |
| Authored | `2026-09-14T11:39:52+07:00` |
| Branch | `ao/ao-008-runtime-handoff` |
| Worktree | `.../new-project-53` |
| Reachable from base | No |
| Reachable from PR #1 head | No |
| Present on `origin` | No |
| Files changed | `+ docs/ai/AO-RUNTIME-HANDOFF.md`, `M run-ui-autonomous-failover.ps1` |

Held only by `ao/ao-008-runtime-handoff`, the branch of the live session
`new-project-53` (AO-008). This commit did **not** exist during revision 1 of this
audit; it was created concurrently by that session and is the newest unique commit
in the repository.

Its commit message records that the change was verified (parser check 0 errors on
PS 5.1.26100.9444, `ao doctor` PASS, orchestrator validate passed, 8/8 failover
rotation models resolve) and asserts that no credential value is recorded. This
audit confirms the assertion by inspection: the change touches a launcher script
and adds a runtime-handoff document, and no credential value is present in either.
The message references the User-to-Process credential handoff rule by name only.

This commit is active work-in-progress on a live lease, not a retained artifact.
It is preserved by its owning session and is listed here for completeness so that
no unique commit is uncounted. AO-007 makes no disposition claim over it.

### Patch-equivalent branches

The following 16 branches are ahead of base only by commits that are
patch-equivalent to content already upstream. They are redundant carriers, not
unique work: `ao/new-project-20/root`, `ao/new-project-21/report-engine-tests`,
`ao/new-project-22/root`, `ao/new-project-23/root`, `ao/new-project-24/integration`,
`ao/new-project-30/fix-integration`, `docs-truth`, `final-close`, `finalverify`,
`fix-browser-report`, `fix-server-dns`, `hostile-review`, `residual-fix`,
`reverify`, `secheck`, `security-review`.

Note: `git diff` between these old branches and the current base shows very large
deletions. That is an artifact of comparing pre-recovery trees against a much
newer base, not an indication that the branches remove work. `git cherry` is the
authoritative signal here.

## Dirty and untracked classification

### `D:/New Project` — highest-value uncommitted state

6 tracked files modified, 3 untracked files. Nothing here is committed.

| Path | State | Classification |
|---|---|---|
| `docs/ai/AO-TASK-REGISTRY.json` | modified | Uncommitted orchestration state |
| `docs/ai/OPENAGENTIC-CONFIG.md` | modified | Uncommitted docs |
| `dist/index.html` | modified | Generated output |
| `dist/evidence.html` | modified | Generated output |
| `dist/downloads/evidence-checklist-v0.2.md` | modified | Generated output |
| `dist/downloads/sample-acme-bookings.md` | modified | Generated output |
| `README.txt` | untracked | Local operator note |
| `start-ao.cmd` | untracked | Local launcher |
| `start-internal-tool.cmd` | untracked | Local launcher |

**Uncommitted registry delta.** The working-copy registry differs from the
committed registry at `9f0e5fd`. It contains AO-007 orchestration state that the
committed version does not:

- `AO-007.status` is `LEASED` (committed: `READY`)
- `AO-007.worker_session` is `new-project-52` (committed: `null`)
- `AO-007.lease.lease_id` is `c12e60e7-ec19-4163-bb16-0c05fd58b766` (committed: `null`)
- `updated_at` differs (`2026-09-14T04:27:05.826Z` vs `2026-09-14T11:04:00+07:00`)

This is the live lease record for this task. It exists only in the working tree of
`D:/New Project` and is not committed on any branch. It must be preserved.

**Secret check.** The untracked launchers reference `OPENAGENTIC_API_KEY` by
environment-variable name only and read it from `HKCU\Environment` at runtime.
No literal key, token, or credential value is present in any retained file. No
secret was read, printed, or recorded by this audit.

### Other dirty worktrees

| Worktree | State | Contents | Classification |
|---|---|---|---|
| `new-project-23` | untracked `internal/tool/tests/screenshots/` | 15 PNGs, ~3.59 MB | Generated QA artifact |
| `new-project-25` | untracked `internal/tool/tests/screenshots/` | screenshot set | Generated QA artifact |
| `new-project-29` | untracked `internal/tool/tests/screenshots/` | screenshot set | Generated QA artifact |
| `new-project-30` | untracked `internal/tool/tests/screenshots/` | screenshot set | Generated QA artifact |
| `new-project-35` | untracked `internal/tool/tests/secheck/` | 3 files, ~27 KB (`REPORT.md`, two probe scripts) | Generated security-check artifact |

`new-project-53` was listed here in revision 1 with an uncommitted edit to
`run-ui-autonomous-failover.ps1`. That edit was committed by its own session as
`26d3cb6` and the worktree is now **clean**. Revision 1 correctly left the file
untouched; AO-008 completed and committed it independently. No AO-007 action was
taken on it at any point.

## Remote exposure

| Branch | Local | Remote | Relationship |
|---|---|---|---|
| `checkpoint/internal-tool-ao` | `9f0e5fd` | `7016a07` | local ahead by 19 |
| `ao/platform-recovery` | `3b4b676` | `9f0e5fd` | remote ahead by 1 |

`ao/reconcile-kanban`, `qa-integration`, and `ao/new-project-46/root` have no
upstream configured. All three unique commits (`26d3cb6`, `9312dec`, `17a7430`)
are confirmed **absent from `origin`** by explicit `git ls-remote` hash lookup.
They exist only in this local repository. This is the single largest preservation
risk identified by this audit: if the local repository is lost, all three commits
are lost.

Note that this risk is broader than the unique commits. 70 of the 72 local
branches have no remote counterpart containing their own tip — most of those
because they carry no unique work, but the three above carry work that exists
nowhere else.

## Dispositions

Every retained worktree is classified below. "Cleanup-candidate" is a factual
label for owner review only. It is not a deletion recommendation, and no cleanup
was performed or scheduled.

| Worktree | Disposition | Rationale |
|---|---|---|
| `D:/New Project` | `KEEP_PRESERVED_UNCOMMITTED` | Holds live AO-007 lease record and other uncommitted state on no branch |
| `new-project-46` | `KEEP_PRESERVED_UNIQUE_COMMIT` | Sole holder of unique `9312dec` |
| `new-project-25` | `KEEP_PRESERVED_UNIQUE_COMMIT` | Sole holder of unique `17a7430` (`SUPERSEDED` per AO-004, still preserved) |
| `new-project-53` | `KEEP_ACTIVE_TASK_SCOPE` | Live AO-008 session; now clean and holding unique commit `26d3cb6` |
| `new-project-23` | `KEEP_ARTIFACT_ONLY` | Commit patch-equivalent to base; only untracked screenshots |
| `new-project-29` | `KEEP_ARTIFACT_ONLY` | Commit patch-equivalent to base; only untracked screenshots |
| `new-project-30` | `KEEP_ARTIFACT_ONLY` | Commit patch-equivalent to base; only untracked screenshots |
| `new-project-35` | `KEEP_ARTIFACT_ONLY` | Commit patch-equivalent to base; only untracked secheck output |
| `new-project-51` | `CLEANUP_CANDIDATE_OWNER_DECISION` | Clean; commit patch-equivalent to base |
| `new-project-52` | `KEEP_ACTIVE_TASK_SCOPE` | This AO-007 audit session |
| `new-project-54` | `KEEP_ACTIVE_TASK_SCOPE` | Live AO-009 session |
| `orchestrator/new-project-orchestrator` | `KEEP_ACTIVE_TASK_SCOPE` | Lead orchestrator worktree |
| `ao-reconcile` | `CLEANUP_CANDIDATE_OWNER_DECISION` | Clean; commit patch-equivalent to base |

## Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Every retained dirty worktree is classified | PASS | 6 dirty worktrees classified above; all 13 inspected |
| Unique commits remain preserved | PASS | `26d3cb6` on `ao/ao-008-runtime-handoff`, `9312dec` on `ao/new-project-46/root`, `17a7430` on `qa-integration`; all live on their refs |
| No worktree is deleted | PASS | Read-only audit; no deletion, move, merge, or publish performed |

## Open items for the owner

These are observations, not actions taken. Each requires an explicit owner
decision and is outside AO-007's authorized scope.

1. **Unique commits are local-only.** `26d3cb6`, `9312dec`, and `17a7430` exist
   on no remote. Integrating or pushing them is a separate, owner-authorized
   decision. `26d3cb6` is the live AO-008 session's own work and is expected to be
   carried by that task's normal PR flow.
2. **The live AO-007 lease record is uncommitted.** It exists only in the
   `D:/New Project` working tree. Committing it is outside this task's write
   scope (`docs/ai/session-reconciliation/AO-007-retained-worktrees.md`).
3. **Two cleanup candidates await owner decision.** `new-project-51` and
   `ao-reconcile` are clean and patch-equivalent to base, but this task does not
   delete worktrees.
4. **AO-004 disposition stands.** The `17a7430` `SUPERSEDED` classification was
   re-verified, not changed.
