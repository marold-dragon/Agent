# Are you handing over the project — or just handing over the code?

A human-reviewed evidence report showing what has actually been transferred, what still depends on you, and what needs to change before handoff.

*Built with Lovable, Bolt, Cursor, Claude Code — or the old-fashioned way.*

---

## Source code isn't the same as operational ownership

A repository doesn't tell your client whether:

- the domain is really under their control
- production hosting still sits in your personal account
- the database belongs to the client organisation
- a fresh checkout can install and build
- someone other than you knows how to deploy
- a rollback procedure exists
- application data has a documented recovery path

A project can look finished while still depending on the person who built it. This report focuses on that dependency.

## What this checks

The pilot reviews submitted evidence for:

- repository control
- domain and DNS control
- hosting/deployment-platform control
- database control
- important third-party service ownership
- clean install and production-build evidence
- documented environment-variable names
- deployment documentation
- rollback documentation
- application-data recovery documentation
- known manual processes or dependencies on the outgoing builder

## What this is not

This is not a security audit, a vulnerability scan, a code review, a performance audit, an SEO audit, a certification that the client can personally fix software bugs, an independent execution test of every documented procedure, or a warranty that the submitted evidence is complete.

It checks one narrow thing: **does the submitted evidence reveal hidden operational dependencies on the outgoing builder?**

## What you get

A client-ready handoff record. Each assessed item is marked SUPPORTED, ATTESTED, NOT SUPPORTED, or NOT ASSESSED, with a short explanation of what evidence was supplied, what it supports, what remains unresolved, and what should be addressed before handoff.

**[ See the evidence checklist and a sample report → ]**

## An operational paper trail

The goal is not legal protection. The goal is a clearer operational record at the moment a project changes hands.

Instead of six weeks later trying to remember who owns the domain, whether Vercel was ever transferred, where the database is, how to roll back, or whether recovery was ever documented — you have a written record showing what was supported by evidence, what was only attested, what was missing, and what was outside the assessment.

For the client, that creates clearer visibility into what was transferred. For the freelancer or agency, it creates a cleaner record of what remained unresolved at handoff.

## How it works

1. **Generate your evidence** — you run a short documented set of commands yourself and collect the relevant non-sensitive ownership evidence. I do not run commands inside your production environment.
2. **Complete the ownership matrix** — you record who controls the repository, domain/DNS, hosting, database, and relevant third-party operational services.
3. **Submit the evidence** — choose one of two options: standard attachment (any retained copy deleted within 7 days of report delivery), or a customer-controlled read-only shared folder you can revoke after review.
4. **Human review** — I manually assess each item against the evidence supplied. There is no AI PASS/FAIL verdict.
5. **Receive the report** — a written handoff evidence report with a status and evidence notes for each applicable item, plus recommended handoff actions.

## What you should never send

Never send passwords, API keys, access tokens, .env values, database credentials, private keys, session cookies, production secrets, or card details. Redact them if they appear in screenshots or command output.

I never request or receive card details as part of the handoff review. Payment is handled separately by the checkout provider.

## Scope and limits

The report reflects only the evidence you supply. It is not an independent audit. It does not independently execute deployment, rollback, data restoration, infrastructure changes, account transfers, or security testing. A documented procedure is not the same thing as an execution-tested procedure — the report states that distinction wherever relevant.

## Pilot pricing

**$49** — one project, one time, limited to the first 20 qualified projects. No subscription yet.

A fully clean result is completely valid — this pilot is not promising to find a problem. The checklist is designed to be quick for a straightforward project; more complex stacks may take longer, and there's no fixed completion-time promise during this pilot batch.

**[ See the evidence checklist → ]**

*(next page shows the full checklist + sample report + qualification questions, then:)*

**[ Book your $49 pilot report ]**
