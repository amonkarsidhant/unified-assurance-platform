# Architecture Overview

## Objective

Provide one executable framework to evaluate release readiness across **quality, security, resilience (chaos), policy, and evidence integrity** signals.

## Core components

### 1) Policy and control plane

- `policies/quality-gates.yaml` defines hard/soft gates.
- `policies/risk-model.yaml` maps service criticality and change-risk to required controls.
- `policies/tiers/{low,medium,high,critical}.json` defines tier-specific mandatory controls (including chaos expectations for higher tiers).
- `catalog/test-catalog.yaml` standardizes required and optional test suites, including resilience/chaos controls.
- `config/control-ownership.json` maps controls to approval/ownership roles.

### 2) Assurance execution plane

- `scripts/run-assurance.sh` orchestrates:
  - lint, unit, integration, contract
  - security scans (SAST/SCA/DAST)
  - performance smoke
  - chaos resilience (`scripts/run-chaos-checks.sh`)
  - optional API/UI smoke (Newman/Playwright)
- Design choice: safe local execution with explicit pass/fail/skipped status + reason.

### 3) Governance and promotion plane

- `scripts/validate-exceptions.py` validates exception governance (expiry, approver, metadata).
- `scripts/evaluate-flaky-policy.py` evaluates flaky-test policy before promotion.
- `scripts/evaluate-promotion.py` enforces hard promotion criteria:
  - mandatory controls by risk tier
  - exception validity
  - evidence integrity (signature/attestation fail-closed for required tiers)
  - outputs `artifacts/latest/promotion-decision.json`.

### 4) Evidence and decision plane

- `scripts/normalize-results-v2.py` creates standardized `results.v2.json` while preserving legacy `results.json`.
- `scripts/generate-release-report.py` produces GO/CONDITIONAL/NO-GO reports with control matrix + exceptions + chaos section.
- `scripts/create-evidence-bundle.py` and `scripts/sign-evidence-bundle.sh` produce deterministic evidence bundles and signature flow.

### 5) Observability plane

- `scripts/export-assurance-metrics.py` exports assurance + governance + chaos metrics to Prometheus textfile format.
- Local stack (`infra/local/docker-compose.yml`) includes Grafana, Prometheus, Loki, Tempo, OTel Collector, Node Exporter textfile collector.
- Dashboards:
  - **UAP Local Observability Overview** (infra health)
  - **UAP Assurance Dashboard** (quality/security/release posture)
  - **UAP Assurance Governance Dashboard** (promotion, exceptions, evidence integrity, flaky policy, chaos governance)

## End-to-end flow

1. Developer opens PR.
2. CI runs assurance pipeline and generates artifacts.
3. Results normalized to `results.v2.json`.
4. Promotion policy evaluates controls + exceptions + evidence integrity.
5. Metrics exported to Prometheus and visualized in Grafana dashboards.
6. Evidence bundle and release report provide auditable release decision.

## Design principles

- Policy as code
- Fail-closed on critical governance controls
- Auditability by default
- Local-first reproducibility
- Platform-agnostic resilience testing (non-K8s-first)
