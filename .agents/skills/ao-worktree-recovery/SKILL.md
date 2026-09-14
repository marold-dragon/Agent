---
name: ao-worktree-recovery
description: Preserve and reconcile AO branches, commits, dirty worktrees, and interrupted sessions. Use after crashes, stale sessions, wrong-base worktrees, or ownership transfer; do not use for ordinary feature work.
compatibility: opencode
---

# AO worktree recovery

1. Identify the canonical `TASK_ID` and lease generation.
2. Inspect worktree status, untracked files, branch, base, commits, patch equivalence, and remote state.
3. Capture a redacted snapshot before changing state. Never copy or print secrets.
4. Preserve unique changes with a branch, commit, or patch in a protected local snapshot.
5. Reconcile onto the canonical base with the smallest safe operation.
6. Re-run required tests and return evidence to the same task.
7. Release or transfer the lease. Do not create retry task IDs.

Output: classification, preserved refs, reconciliation action, test result, and recommended disposition.
