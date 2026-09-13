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

