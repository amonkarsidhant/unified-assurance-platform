# Architecture Overview

## Objective
Provide one executable framework to evaluate release readiness across test, risk, security, and reliability signals.

## Core components

### 1) Policy and control plane
- `policies/quality-gates.yaml` defines hard and soft gates.
- `policies/risk-model.yaml` maps service criticality and change-risk to required controls.
- `catalog/test-catalog.yaml` standardizes required and optional test suites.

### 2) Assurance execution plane
- `scripts/run-assurance.sh` runs a baseline pipeline:
  - lint/config validation
  - unit tests
  - integration tests
  - contract/API checks
  - security scans (SAST/dependency placeholder wiring)
  - performance smoke
- GitHub Actions templates align local and CI behavior.

### 3) Evidence and decision plane
- `scripts/collect-evidence.sh` snapshots artifacts, policy files, and metadata into timestamped evidence folders.
- `scripts/generate-release-report.py` translates JSON results into release guidance:
  - **GO**: all mandatory gates passed
  - **CONDITIONAL**: only non-critical soft gates failed
  - **NO-GO**: mandatory gate failures or critical security/reliability breaches

### 4) Observability plane
- `observability/otel-collector-config.yaml` receives traces/metrics/logs and exports to OTLP backends.
- `observability/dashboards.md` defines minimum operational dashboards tied to SLOs and release health.

## Flow
1. Team commits code and test updates.
2. CI template executes category-specific workflow.
3. Results are normalized to JSON.
4. Report script computes recommendation.
5. Evidence bundle is archived for audit.

## Design principles
- Policy as code
- One source of truth for release decisions
- Local-first reproducibility
- Auditability by default
