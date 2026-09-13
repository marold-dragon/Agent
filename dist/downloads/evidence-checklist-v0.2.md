# Evidence Checklist v0.2

## Status definitions

Every assessed item receives one of four statuses:

**SUPPORTED**  
Non-sensitive evidence was submitted that supports the stated condition.

**ATTESTED**  
The requester states that the condition is true, but no supporting artefact was submitted.

**NOT SUPPORTED**  
Submitted evidence contradicts the stated condition, or the requester confirms that the required condition is not currently in place.

**NOT ASSESSED**  
There is not enough information to make an assessment, or the item falls outside the evidence submitted.

A `SUPPORTED` status does **not** mean that the underlying system, procedure, account, deployment, rollback, or recovery action was independently executed or verified unless the report explicitly says execution evidence was submitted.

---

# A. Ownership and Control

| Item | What is assessed | Minimum evidence for SUPPORTED | Other possible status |
|---|---|---|---|
| Repository control | Whether the project repository is controlled through a client-owned account or organisation | Non-sensitive screenshot or account/org record showing the repository under the client's GitHub/GitLab/other organisation | ATTESTED / NOT SUPPORTED / NOT ASSESSED |
| Domain / DNS control | Whether the client controls the registrar and/or authoritative DNS account | Redacted screenshot or account record showing the domain/DNS under a client-controlled account | ATTESTED / NOT SUPPORTED / NOT ASSESSED |
| Hosting / deployment platform control | Whether the production deployment is under a client-controlled organisation/account | Redacted Vercel/Netlify/Railway/other project or team ownership evidence | ATTESTED / NOT SUPPORTED / NOT ASSESSED |
| Database control | Whether the production database project/account is controlled by the client | Redacted organisation/project ownership evidence from Supabase/Postgres provider/other service | ATTESTED / NOT SUPPORTED / NOT ASSESSED |
| Other operational services | Whether key third-party services have been identified and their ownership recorded | Service inventory showing provider, purpose, and owner; artefacts required individually if the report is to mark ownership as SUPPORTED | ATTESTED / NOT SUPPORTED / NOT ASSESSED |

Examples of operational services may include transactional email, object storage, payments, analytics, queues, background workers, DNS/CDN, authentication, or other services the application depends on.

---

# B. Reproducibility

| Item | What is assessed | Minimum evidence for SUPPORTED | Other possible status |
|---|---|---|---|
| Clean install | Whether the requester produced evidence that a fresh checkout can install project dependencies | Command used, non-sensitive output, and successful exit status from a fresh checkout/install attempt | ATTESTED / NOT SUPPORTED / NOT ASSESSED |
| Production build | Whether the requester produced evidence that the project can complete its documented production build | Build command, non-sensitive output, and successful exit status | ATTESTED / NOT SUPPORTED / NOT ASSESSED |
| Environment-variable documentation | Whether a list of required environment-variable names has been documented | A submitted list of variable names only — never values | ATTESTED / NOT SUPPORTED / NOT ASSESSED |

**Important:** Environment-variable documentation is assessed only on whether a list was supplied. The report does **not** claim that the list is complete relative to the source code because source code is not reviewed as part of this pilot.

---

# C. Operations

## Deployment

**Definition:** the documented process by which a new application version reaches production.

| Item | Minimum evidence for SUPPORTED |
|---|---|
| Deployment procedure | Written deployment steps plus non-sensitive evidence that the requester/client has the access needed to initiate the documented process |

`SUPPORTED` means the procedure and required control/access evidence were supplied. It does not mean I independently executed a production deployment unless explicitly stated.

---

## Rollback

**Definition:** the documented process for returning the running application to a previous application version.

| Item | Minimum evidence for SUPPORTED |
|---|---|
| Rollback procedure | Written rollback steps that identify the rollback mechanism and required access |

`SUPPORTED` means a rollback procedure was documented with supporting evidence. It does **not** mean the rollback was execution-tested.

If actual rollback execution evidence is submitted, the report may state that such evidence was supplied, but this remains distinct from an independently conducted rollback test.

---

## Data recovery

**Definition:** the documented process for restoring application data after loss or corruption.

| Item | Minimum evidence for SUPPORTED |
|---|---|
| Data-recovery procedure | Written procedure identifying the data source/backup mechanism and steps intended to restore application data |

`SUPPORTED` means a data-recovery procedure was documented with supporting evidence.

It does **not** mean that a restore was successfully execution-tested.

This pilot does not assess full disaster recovery, business continuity, regional failover, or infrastructure reconstruction.

---

# D. Known Manual Dependencies

| Item | What is assessed | Minimum evidence |
|---|---|---|
| Known issues / manual processes | Anything that currently depends on the outgoing builder, undocumented knowledge, a manual workaround, or a personal account | Requester declaration is accepted but remains `ATTESTED` unless supporting evidence is supplied |

Examples:

- a deployment step only the contractor knows;
- a vendor account still owned personally by the builder;
- a manual cron/job restart;
- a client-specific workaround;
- a domain renewal controlled by the contractor;
- a recovery process known only informally.

---

# Never submit

Do **not** submit:

- passwords;
- API keys;
- access tokens;
- `.env` values;
- database credentials;
- private keys;
- session cookies;
- card details;
- customer payment data.

Redact secrets if they appear in screenshots or command output.

Payment for the report is handled separately by the checkout provider. I never request or receive card details as part of the handoff review.

---

