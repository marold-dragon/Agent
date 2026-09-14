# AO orchestrator state

STATUS: VALIDATING_DRAFT_PR
CANONICAL_BRANCH: checkpoint/internal-tool-ao
CANONICAL_HEAD_AT_AUDIT: 397eac57acf1902a85677d8ec940e791aba9f984
REGISTRY: docs/ai/AO-TASK-REGISTRY.json

## Live control state

- AO daemon is healthy on its local service.
- Old Kanban cards are historical session projections and are not scheduling authority.
- The stale native orchestrator was based on `7016a07`, ten commits behind the canonical local head. Its uncommitted inline credential was recorded by hash and removed; the database was snapshotted locally first.
- Workers 47 and 48 were closed after producing no unique changes; worker 46's security findings were migrated to `AO-003`.
- Forty-five historical project skills existed locally but their `SKILL.md` files were ignored by Git. The ignore rules now make native skill instructions portable to new worktrees.
- The active topology is defined in `opencode.json`: one lead, three orchestrators, and five available leaves, below the six-leaf cap.

## Current canonical tasks

- `AO-001`: platform recovery and hardening.
- `AO-002`: closed after publishing `ao/platform-recovery` and opening Draft PR #1.
- `AO-003`: fixed and validating in the same Draft PR.
- `AO-004`: classified as superseded; its branch/worktree remains preserved.

No retry, probe, final-check, or replacement task IDs are permitted for these objectives.
