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

# Sample Report — Acme Bookings

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

| Item | Status | Evidence / Notes |
|---|---|---|
| Repository control | **SUPPORTED** | Submitted screenshot shows the repository under the client-owned GitHub organisation `acme-inc`. No repository credentials were provided. |
| Domain / DNS control | **NOT SUPPORTED** | Submitted account information shows the domain remains registered under the outgoing contractor's personal registrar account. Recommended before handoff: transfer registration/control to a client-owned account. |
| Hosting — Vercel | **NOT SUPPORTED** | Submitted evidence shows the production project remains under the outgoing contractor's personal Vercel team. Recommended before handoff: transfer the project to a client-controlled team or organisation. |
| Database — Supabase | **SUPPORTED** | Submitted organisation screenshot shows the production Supabase project under a client-controlled organisation. No database credentials were provided. |
| Clean install and build | **SUPPORTED** | Requester supplied non-sensitive output showing a fresh checkout followed by `pnpm install` and `pnpm build`, both completing with exit status 0. This report did not independently execute the commands. |
| Environment-variable documentation | **SUPPORTED** | A list containing 14 required environment-variable names was supplied. No values were submitted. This assessment does not claim that the list is complete relative to source code. |
| Deployment procedure | **SUPPORTED** | Written deployment steps were supplied together with evidence that the client-controlled Vercel organisation has access to initiate the documented deployment path. The deployment was not independently executed as part of this review. |
| Rollback procedure | **NOT ASSESSED** | No sufficient rollback procedure or supporting artefact was submitted. No claim is made about whether a working rollback path exists. |
| Data-recovery procedure | **NOT SUPPORTED** | The requester stated that no documented application-data recovery procedure currently exists. No restore execution was assessed. |

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
