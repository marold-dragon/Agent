# Evidence Checklist v0.2

## Status definitions

Every assessed item receives one of four statuses:

**SUPPORTED** — Non-sensitive evidence was submitted that supports the stated condition.

**ATTESTED** — The requester states that the condition is true, but no supporting artefact was submitted.

**NOT SUPPORTED** — Submitted evidence contradicts the stated condition, or the requester confirms the required condition is not currently in place.

**NOT ASSESSED** — There is not enough information to make an assessment, or the item falls outside the evidence submitted.

A SUPPORTED status means submitted evidence supports the stated condition. Requester-submitted execution evidence is not independent execution or verification by the reviewer.

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
Minimum evidence for SUPPORTED: written deployment steps plus non-sensitive evidence that the requester/client has the access needed to initiate the documented process. A documented procedure does not establish that deployment was execution-tested.

**Rollback** — the documented process for returning production to a previous version.
Minimum evidence for SUPPORTED: written rollback steps identifying the mechanism and required access. SUPPORTED does not mean the rollback was execution-tested.

**Data recovery** — the documented process for restoring application data after loss or corruption.
Minimum evidence for SUPPORTED: written procedure identifying the data source/backup mechanism and restore steps. A documented procedure does not establish that a restore was execution-tested. This pilot does not assess full disaster recovery, business continuity, regional failover, or infrastructure reconstruction.

## D. Known Manual Dependencies

| Item | What is assessed | Minimum evidence |
|---|---|---|
| Known issues / manual processes | Anything that currently depends on the outgoing builder, undocumented knowledge, a manual workaround, or a personal account | Requester declaration accepted, but remains ATTESTED unless supporting evidence is supplied |

*Examples: a deployment step only the contractor knows; a vendor account still owned personally by the builder; a manual cron/job restart; a domain renewal controlled by the contractor; a recovery process known only informally.*

## Never submit

Never send passwords, API keys, access tokens, .env values, database credentials, private keys, session cookies, card details, or customer payment data. Redact secrets if they appear in screenshots or command output. Payment is handled separately by the checkout provider — I never request or receive card details as part of the review.

---

Other services and known manual dependencies above are supporting checklist material. They are not additional scored items in the fictional nine-item sample below.

# Sample Report — Acme Bookings (fictional)

**Handoff Evidence Report**

Project: Acme Bookings  
Prepared by: Martua  
Review type: Human-reviewed submitted evidence

## Scope

This report reflects only the evidence supplied by the requester.

It is not an independent security audit, code review, operational certification, or warranty of completeness.

A `SUPPORTED` status means submitted evidence supports the stated condition. It does not mean the underlying action was independently executed unless explicitly stated.

---

## Assessment

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Repository control | **SUPPORTED** | Submitted screenshot shows the repository under the client-owned GitHub organisation `acme-inc`. No repository credentials were provided. |
| 2 | Domain/DNS control | **NOT SUPPORTED** | Submitted account information shows the domain remains registered under the outgoing contractor's personal registrar account. Recommended before handoff: transfer registration/control to a client-owned account. |
| 3 | Hosting/deployment control | **NOT SUPPORTED** | Submitted evidence shows the production project remains under the outgoing contractor's personal Vercel team. Recommended before handoff: transfer the project to a client-controlled team or organisation. |
| 4 | Database control | **SUPPORTED** | Submitted organisation screenshot shows the production Supabase project under a client-controlled organisation. No database credentials were provided. |
| 5 | Clean install/build | **SUPPORTED** | Requester supplied non-sensitive output showing a fresh checkout followed by `pnpm install` and `pnpm build`, both completing with exit status 0. This report did not independently execute the commands. |
| 6 | Environment-variable documentation | **SUPPORTED** | A list containing 14 required environment-variable names was supplied. No values were submitted. This assessment does not claim that the list is complete relative to source code. |
| 7 | Deployment procedure | **SUPPORTED** | Written deployment steps were supplied together with evidence that the client-controlled Vercel organisation has access to initiate the documented deployment path. The deployment was not independently executed as part of this review. |
| 8 | Rollback procedure | **NOT ASSESSED** | No sufficient rollback procedure or supporting artefact was submitted. No claim is made about whether a working rollback path exists. |
| 9 | Data-recovery procedure | **NOT SUPPORTED** | The requester stated that no documented application-data recovery procedure currently exists. No restore execution was assessed. |

---

## Summary

**9 items assessed**

- **SUPPORTED:** 5
- **ATTESTED:** 0
- **NOT SUPPORTED:** 3
- **NOT ASSESSED:** 1

**5 of 9 items are supported by the submitted evidence.**

Two current operational dependencies on the outgoing builder were identified:

1. Domain registration/control remains under the contractor's personal account.
2. Production hosting remains under the contractor's personal Vercel team.

One additional operational gap was identified:

3. No documented application-data recovery procedure currently exists.

Rollback readiness was **not assessed** because sufficient evidence was not supplied.

---

## Recommended before handoff

1. Transfer domain registration/control to a client-owned account.
2. Transfer production hosting to a client-controlled Vercel organisation.
3. Document the intended application-data recovery procedure.
4. Supply/document a rollback procedure if rollback readiness is expected to be included in a future handoff record.

---

## Important limitation

This report documents and reviews submitted evidence.

It does not independently execute deployments, rollbacks, restores, account transfers, production changes, or security testing.
