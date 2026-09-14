---
name: ao-task-execution
description: Execute one leased AO implementation task within its declared files and directories, producing tests, a commit, and Draft PR evidence. Do not use without an active lease or for orchestration administration.
compatibility: opencode
---

# AO task execution

1. Verify `TASK_ID`, lease owner, branch, worktree, write scope, acceptance criteria, and required tests.
2. Load only required or justified recommended skills; record why each was loaded.
3. Refuse writes outside the owned scope and stop on a conflicting active lease.
4. Implement the smallest complete change, run required tests, and record meaningful progress.
5. Commit to the canonical task branch, push, and create or update its Draft PR.
6. If external PR access fails, record `BLOCKED_EXTERNAL_PR`; do not create another worker or task.

Output: changed files, tests, commit, PR URL/state, evidence, and remaining blocker.
