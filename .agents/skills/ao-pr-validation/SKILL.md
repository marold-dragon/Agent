---
name: ao-pr-validation
description: Independently validate one canonical AO task and Draft PR against acceptance criteria, tests, security, and merge readiness. Do not edit implementation files or create replacement fix tasks.
compatibility: opencode
---

# AO PR validation

1. Confirm the task ID, PR URL, head commit, acceptance criteria, and required tests.
2. Review the diff and reproduce all required checks from a clean state.
3. Report findings with severity, file/location, reproduction, and expected behavior.
4. On failure, transition the same task to `CHANGES_REQUESTED` and return it to its implementation owner.
5. On success, record `validation_passed`; readiness still requires a real PR and conflict-free head.

Output: PASS or CHANGES_REQUESTED, reproduced evidence, findings, and verified head commit.
