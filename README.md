# Unified Assurance Platform (UAP)

A production-ready starter repository for building a **Unified Assurance Platform**: one place to define quality gates, risk policy, test catalogs, CI templates, observability hooks, and release evidence.

## Vision
Ship faster with confidence by making quality decisions:
- **Policy-driven** (quality gates + risk model)
- **Automated** (CI templates + executable scripts)
- **Auditable** (evidence collection + release reports)
- **Pragmatic** (works for API, web, event-driven, and auth/payments flows)

## Architecture (v1)
1. **Policy layer**: `policies/quality-gates.yaml`, `policies/risk-model.yaml`
2. **Execution layer**: `scripts/run-assurance.sh`, CI templates in `ci/templates/github-actions/`
3. **Evidence + reporting**: `scripts/collect-evidence.sh`, `scripts/generate-release-report.py`, `reporting/`
4. **Telemetry layer**: `observability/otel-collector-config.yaml`, dashboard guidance
5. **Domain onboarding**: golden paths and sample service descriptors in `docs/golden-paths/` and `examples/services/`

### Architecture diagram
```mermaid
flowchart LR
  U[Users / Stakeholders] --> LB[Load Balancer / Ingress]
  LB --> API[API Services on VM/Containers]
  API --> DB[(Primary DB)]
  API --> REP[(Read Replica)]
  API --> C[(Cache)]
  API --> Q[(Queue)]
  Q --> W[Async Workers]

  API --> OTEL[OpenTelemetry Collector]
  W --> OTEL
  OTEL --> OBS[(Metrics / Logs / Traces Dashboards)]

  P[Policies\nquality-gates + risk-model] --> CI[CI/CD Assurance Pipelines]
  TC[Test Catalog] --> CI
  CI --> API
  CI --> RPT[Release Report + Evidence Bundle]
  RPT --> U
```

Detailed architecture: `docs/architecture.md` and `docs/reference-architecture/diagram.md`

## Quick start
```bash
make bootstrap
make validate
make tooling-check
make run-assurance
make run-assurance-real
make report RESULTS=artifacts/latest/results.json OUT=artifacts/latest/real-tools-report.md
```

## One-command live demo (golden path)
```bash
make demo-e2e
```
This starts observability + demo app + demo UI, runs real assurance, and generates:
- `artifacts/latest/demo-e2e-report.md`

## Start Here (Non-QE)
If you are new to Quality Engineering, read these first:
- `docs/qe-primer.md` — plain-English QE basics, test types, and anti-patterns
- `docs/methodology-map.md` — how shift-left, risk-based testing, gates, CI/CD, and observability fit together
- `docs/roles-and-consumption.md` — what each stakeholder role should read and do
- `docs/demo-walkthrough.md` — 10-minute walkthrough for happy vs broken release scenarios
- `demo/README.md` — runnable local demo quickstart
- `demo/site/index.html` — stakeholder-friendly demo website UI

Artifacts created in:
- `artifacts/latest/` (run outputs)
- `evidence/<timestamp>/` (auditable bundle)

## Real tool mode (open-source scanners + smoke tests)

`make run-assurance` stays pragmatic (simulates when tools are missing).

`make run-assurance-real` forces real-tool mode and marks unavailable tools as `skipped` with reasons in logs:
- k6 (`tests/perf/smoke.js`)
- semgrep (`tests/security/semgrep-rules.yml`)
- trivy (`trivy fs` over repo)
- OWASP ZAP baseline (`dast_zap`) against a target URL
- optional newman (if collection exists)
- optional playwright smoke (if test exists)

Useful env overrides:
- `TRIVY_SEVERITY=CRITICAL,HIGH`
- `TRIVY_EXIT_CODE=0` (non-fatal default)
- `PERF_TARGET_URL=https://test.k6.io`
- `K6_VUS=2 K6_DURATION=5s`
- `ZAP_TARGET_URL=http://127.0.0.1:5678`
- `ZAP_TIMEOUT_MIN=2`
- `ZAP_FAIL_LEVEL=medium`

Run only the lightweight ZAP step (laptop-friendly):

```bash
make zap-smoke
```

Notes for macOS:
- If `zap-baseline.py` is not installed locally, the script falls back to Dockerized ZAP when Docker is available.
- For localhost targets, Docker path automatically uses `host.docker.internal` so ZAP can reach host services.
- If Gatekeeper blocks downloaded binaries, install via Homebrew (or allow the binary in Privacy & Security) and retry.

## Grafana auto-provisioned dashboard
When `make dev-stack-up` runs, Grafana now auto-loads:
- Folder: `UAP`
- Dashboard: `UAP Local Observability Overview`

Open Grafana at `http://localhost:3000` (`admin/admin`) and go to **Dashboards → UAP**.

## New Golden Path: Enterprise Reference Architecture
For teams deploying transaction platforms with LB + API + VM + DB + queue/cache.

Quick links:
- `docs/reference-architecture/overview.md`
- `docs/reference-architecture/diagram.md`
- `docs/reference-architecture/component-contracts.md`
- `docs/golden-paths/reference-architecture.md`
- `ci/templates/github-actions/reference-architecture.yml`
- `demo/reference-scenarios.md`
- `reporting/reference-architecture-scorecard.md`

## Repo map
- `docs/` product + technical guidance
- `policies/` release gates and risk scoring
- `catalog/` test inventory by category
- `ci/templates/github-actions/` reusable pipeline templates
- `observability/` OpenTelemetry starter config and dashboard contract
- `reporting/` KPI and audit formats
- `scripts/` executable assurance orchestration

## Intended consumers
- Engineering teams adopting a standard quality baseline
- QE/Platform teams building centralized assurance workflows
- Product/security/compliance stakeholders requiring clear release decisions

## Contribution standard
For major design docs and stakeholder-facing reports, follow:
- `docs/contribution-standard.md`
- `templates/self-reflection-template.md` (required self-reflection block)

## Agentic-QE enterprise alignment
- `docs/agentic-alignment-matrix.md`
- `docs/enterprise-hardening-backlog.md`
