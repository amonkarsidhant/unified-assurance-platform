# Golden Path: Enterprise Reference Architecture (LB + API + VM + DB)

## When to use
Use this path for transaction-oriented systems that run APIs on VMs with a relational DB and async workers.

## Step-by-step implementation
1. **Define component boundaries**
   - Confirm LB routes, API services, VM groups, DB topology, queue/cache ownership.
2. **Set non-functional targets**
   - Per-layer latency/error targets, DB lag target, queue backlog target, recovery targets.
3. **Adopt contracts**
   - Implement checks from `docs/reference-architecture/component-contracts.md`.
4. **Wire CI gates by stage**
   - PR: fast checks; pre-release: resilience/security; post-deploy: synthetic + SLO.
5. **Implement failure injection drills**
   - Run scenarios in `demo/reference-scenarios.md` at least once per release cycle.
6. **Publish release evidence**
   - Store reports and snapshots under `artifacts/` and `evidence/<timestamp>/`.

## Test strategy by layer
- **LB layer**: route correctness, health-check failover, TLS/cipher policy, rate-limit sanity.
- **API layer**: unit, integration, contract, auth negative tests, p95 latency smoke.
- **DB layer**: migration validation, replica lag thresholds, backup/restore test, query-plan guardrails.
- **VM/infra layer**: image hardening checks, drift checks, node replacement test, resource saturation smoke.
- **Resilience layer**: timeout injection, dependency loss, queue backlog, partial zone/node loss.
- **Security layer**: SAST, dependency scan, secrets scan, IAM least-privilege checks.
- **Observability layer**: log completeness, trace propagation, golden signals dashboard coverage, actionable alerts.

## Required evidence for sign-off
- Passing test outputs (JSON/JUnit/SARIF where applicable)
- Gate summary with pass/fail per stage
- Failure-injection run results and remediation notes
- Scorecard update in `reporting/reference-architecture-scorecard.md`
