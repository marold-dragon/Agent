# Evidence Checklist v0.2

## Status definitions

Every assessed item receives one of four statuses:

**SUPPORTED** — Non-sensitive evidence was submitted that supports the stated condition.

**ATTESTED** — The requester states that the condition is true, but no supporting artefact was submitted.

**NOT SUPPORTED** — Submitted evidence contradicts the stated condition, or the requester confirms the required condition is not currently in place.

**NOT ASSESSED** — There is not enough information to make an assessment, or the item falls outside the evidence submitted.

A SUPPORTED status does not mean the underlying system, procedure, account, deployment, rollback, or recovery action was independently executed or verified — unless the report explicitly says execution evidence was submitted.

---

## A. Ownership and Control

| Item | What is assessed | Minimum evidence for SUPPORTED |
|---|---|---|
| Repository control | Whether the repository is controlled through a client-owned account/org | Non-sensitive screenshot or account record showing the repo under the client's GitHub/GitLab/other org |
| Domain / DNS control | Whether the client controls the registrar and/or authoritative DNS | Redacted screenshot/account record showing the domain/DNS under a client-controlled account |
| Hosting / deployment platform control | Whether production deployment is under a client-controlled org/account | Redacted Vercel/Netlify/Railway/other project or team ownership evidence |
| Database control | Whether the production database project is controlled by the client | Redacted org/project ownership evidence from Supabase/Postgres/other provider |
| Other operational services | Whether key third-party services are identified and their ownership recorded | Service inventory with provider, purpose, owner; artefacts required per-service for SUPPORTED |

*Examples of operational services: transactional email, object storage, payments, analytics, queues, background workers, DNS/CDN, authentication, and similar dependencies.*

## B. Reproducibility

| Item | What is assessed | Minimum evidence for SUPPORTED |
|---|---|---|
| Clean install | Whether a fresh checkout can install project dependencies | Command used, non-sensitive output, successful exit status from a fresh checkout/install |
| Production build | Whether the project completes its documented production build | Build command, non-sensitive output, successful exit status |
| Environment-variable documentation | Whether required environment-variable names are documented | A submitted list of variable names only — never values |

*Environment-variable documentation is assessed only on whether a list was supplied. This report does not claim the list is complete relative to the source code, because source code is not reviewed in this pilot.*

## C. Operations

**Deployment** — the documented process by which a new version reaches production.
Minimum evidence for SUPPORTED: written deployment steps plus non-sensitive evidence that the requester/client has the access needed to initiate the documented process.

**Rollback** — the documented process for returning production to a previous version.
Minimum evidence for SUPPORTED: written rollback steps identifying the mechanism and required access. SUPPORTED does not mean the rollback was execution-tested.

**Data recovery** — the documented process for restoring application data after loss or corruption.
Minimum evidence for SUPPORTED: written procedure identifying the data source/backup mechanism and restore steps. This pilot does not assess full disaster recovery, business continuity, regional failover, or infrastructure reconstruction.

## D. Known Manual Dependencies

| Item | What is assessed | Minimum evidence |
|---|---|---|
| Known issues / manual processes | Anything that currently depends on the outgoing builder, undocumented knowledge, a manual workaround, or a personal account | Requester declaration accepted, but remains ATTESTED unless supporting evidence is supplied |

*Examples: a deployment step only the contractor knows; a vendor account still owned personally by the builder; a manual cron/job restart; a domain renewal controlled by the contractor; a recovery process known only informally.*

## Never submit

Never send passwords, API keys, access tokens, .env values, database credentials, private keys, session cookies, card details, or customer payment data. Redact secrets if they appear in screenshots or command output. Payment is handled separately by the checkout provider — I never request or receive card details as part of the review.

---

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
