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

Detailed architecture: `docs/architecture.md`

## Quick start
```bash
make bootstrap
make validate
make run-assurance
make report RESULTS=examples/results/sample-results.json OUT=examples/results/sample-report.md
```

Artifacts created in:
- `artifacts/latest/` (run outputs)
- `evidence/<timestamp>/` (auditable bundle)

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
