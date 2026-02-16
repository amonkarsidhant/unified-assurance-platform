# Unified Assurance Platform (UAP)

One platform for quality gates, release evidence, and policy-driven promotion decisions.

## 60-second quickstart

```bash
make bootstrap
make validate
make run-assurance
make report RESULTS=artifacts/latest/results.json OUT=artifacts/latest/release-report.md
```

Open:
- Release report: `artifacts/latest/release-report.md`
- Assurance artifacts: `artifacts/latest/`
- Docs hub: [`docs/README.md`](docs/README.md)

## Local demo flow

Run an end-to-end local demo:

```bash
make demo-e2e
```

Then review:
- Demo UI: `http://127.0.0.1:8790/demo/site/` (auto-fallback to 8791/8792)
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Demo report: `artifacts/latest/demo-e2e-report.md`

Stop local services:

```bash
make demo-down && make demo-site-down && make dev-stack-down
```

## Control plane (hardened direction)

The control plane is the policy decision layer for GO / CONDITIONAL / NO-GO outcomes.

It is designed to be:
- **Fail-closed for high-risk promotion paths**
- **Evidence-first and auditable**
- **Separation-friendly** between execution workers and decision APIs

Read:
- [Control plane MVP](docs/architecture/control-plane-mvp.md)
- [Control plane hardening](docs/architecture/control-plane-hardening.md)
- [Control plane API contract](docs/architecture/control-plane-api-contract.md)

## CI gate model

UAP supports two gate modes:

1. **PR gates (fast feedback)**
   - Lint/unit/integration/smoke checks
   - Policy summary and PR-facing signal
   - Artifact generation for reviewer context

2. **Strict promotion gates (environment promotion)**
   - Tier-aware control requirements
   - Exception validation and expiry enforcement
   - Evidence integrity + promotion decision output (`promotion-decision.json`)

Key docs:
- [Phase 1 enterprise CI/CD](docs/guides/phase1-enterprise-cicd.md)
- [Phase 2 enterprise controls](docs/guides/phase2-enterprise-assurance-controls.md)
- [Phase 2.5 P0 model](docs/guides/phase2-5-p0.md)

## Documentation

Start here: **[docs/README.md](docs/README.md)**

Primary sections:
- [`docs/getting-started/`](docs/getting-started/)
- [`docs/architecture/`](docs/architecture/)
- [`docs/guides/`](docs/guides/)
- [`docs/reference/`](docs/reference/)
- [`docs/reviews/`](docs/reviews/)

## Common commands

```bash
# Baseline validation
make validate

# Real-tool assurance flow
make run-assurance-real

# Promotion check (example: stage)
make validate-exceptions ENV=stage
make promotion-check ENV=stage

# Resilience intelligence flow
make resilience-intelligence
make resilience-report
```

For contribution expectations, see [docs/guides/contribution-standard.md](docs/guides/contribution-standard.md).
