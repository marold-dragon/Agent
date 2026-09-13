# Sample Report — Acme Bookings (fictional)

**Project:** Acme Bookings
**Prepared by:** Martua — human-reviewed submitted evidence

**Scope:** This report reflects only the evidence supplied by the requester. It is not an independent security audit, code review, operational certification, or warranty of completeness. A SUPPORTED status means submitted evidence supports the stated condition — it does not mean the underlying action was independently executed unless explicitly stated.

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Repository control | **SUPPORTED** | Submitted screenshot shows the repository under the client-owned GitHub org `acme-inc`. No repository credentials were provided. |
| 2 | Domain / DNS control | **NOT SUPPORTED** | Submitted account information shows the domain remains registered under the outgoing contractor's personal registrar account. Recommended: transfer registration/control to a client-owned account. |
| 3 | Hosting — Vercel | **NOT SUPPORTED** | Submitted evidence shows the production project remains under the outgoing contractor's personal Vercel team. Recommended: transfer to a client-controlled team/org. |
| 4 | Database — Supabase | **SUPPORTED** | Submitted organisation screenshot shows the production Supabase project under a client-controlled org. No database credentials were provided. |
| 5 | Other operational services | **ATTESTED** | Requester states transactional email (Resend) is under a client-owned account; no ownership screenshot was submitted. |
| 6 | Clean install | **SUPPORTED** | Fresh checkout + `pnpm install`, exit status 0. Commands were not independently executed by this review. |
| 7 | Production build | **SUPPORTED** | `pnpm build`, exit status 0. Commands were not independently executed by this review. |
| 8 | Environment-variable documentation | **SUPPORTED** | A list of 14 required variable names was supplied. No values submitted. This does not assert completeness against source code. |
| 9 | Deployment procedure | **SUPPORTED** | Written deployment steps supplied together with evidence the client-controlled Vercel org can initiate the documented path. Deployment was not independently executed. |
| 10 | Rollback procedure | **NOT ASSESSED** | No sufficient rollback procedure or supporting artefact was submitted. No claim is made about whether a working rollback path exists. |
| 11 | Data-recovery procedure | **NOT SUPPORTED** | Requester stated no documented application-data recovery procedure currently exists. |
| 12 | Known manual dependencies | **ATTESTED** | Requester declares only the outgoing contractor knows the command to restart a background cron job; no supporting documentation submitted. |

## Summary

**12 items assessed** — SUPPORTED: 6 · ATTESTED: 2 · NOT SUPPORTED: 3 · NOT ASSESSED: 1

6 of 12 items are supported by submitted evidence. 2 items are attested only, with no supporting artefact. 3 items are not supported. 1 item was not assessed.

**Operational dependencies on the outgoing builder identified:**
1. Domain registration/control remains under the contractor's personal account.
2. Production hosting remains under the contractor's personal Vercel team.
3. No documented application-data recovery procedure currently exists.
4. Attested-only items (email service ownership, cron restart knowledge) are not yet confirmed by evidence and should be resolved before relying on them.

Rollback readiness was not assessed because sufficient evidence was not supplied.

## Recommended before handoff

1. Transfer domain registration/control to a client-owned account.
2. Transfer production hosting to a client-controlled Vercel organisation.
3. Document the intended application-data recovery procedure.
4. Obtain or document ownership evidence for attested-only items.
5. Supply/document a rollback procedure if rollback readiness is expected in a future handoff record.

## Important limitation

This report documents and reviews submitted evidence. It does not independently execute deployments, rollbacks, restores, account transfers, production changes, or security testing.
