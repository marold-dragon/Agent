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
