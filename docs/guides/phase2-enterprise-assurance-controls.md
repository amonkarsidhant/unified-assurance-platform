# Phase 2: Enterprise Assurance Controls

Phase 2 hardens UAP from advisory risk signals to policy-enforced, auditable release decisions.

## What was added

1. **Risk-tier policy packs**
   - `policies/tiers/{low,medium,high,critical}.json`
   - Mandatory control sets per tier:
     - low: `sast`, `sca`
     - medium: `sast`, `sca`, `contract`
     - high: `sast`, `sca`, `dast`, `contract`, `perf_smoke`
     - critical: high + `resilience` (no exceptions allowed)

2. **Mandatory enforcement in gate logic**
   - `scripts/run-assurance.sh` now:
     - calculates tier (`low|medium|high|critical`)
     - resolves required controls from tier policy pack
     - writes `risk_context.control_status` and missing control list in `results.json`
   - `scripts/evaluate-promotion.py` now enforces tier-required controls as hard gates.

3. **Exception workflow (expiry + approver + audit trail)**
   - Template: `config/exceptions/template.yaml`
   - Validator: `scripts/validate-exceptions.py`
   - Audit output: `artifacts/latest/exceptions-audit.json`
   - Promotion integrates exceptions and records usage in `artifacts/latest/promotion-decision.json`.

4. **Compliance traceability mapping**
   - `docs/compliance/control-traceability.md`
   - Maps each control to evidence files/logs.

5. **Ownership model**
   - `config/control-ownership.json`
   - Defines control owners and approval roles.

6. **CI integration**
   - `.github/workflows/reusable-assurance.yml`: runs exception validation + stage promotion gate.
   - `pre-release.yml` and `post-deploy.yml`: validate exceptions before promotion evaluation.

7. **Reporting improvements**
   - `scripts/generate-release-report.py` now includes:
     - required controls by tier
     - control pass/fail matrix
     - exceptions used (approver + expiry)
     - compliance trace summary

## Operating model

- Assurance run (`make run-assurance` or `make run-assurance-real`) creates `artifacts/latest/results.json`.
- Exception validation (`make validate-exceptions ENV=<env>`) enforces governance rules.
- Promotion gate (`make promotion-check ENV=<env>`) creates auditable decision output.
- Release report (`make report`) combines assurance + promotion context.
- Metrics export (`make assurance-metrics-export`) now includes governance outputs from `promotion-decision.json`, `exceptions-audit.json`, `flaky-policy.json`, `results.v2.json`, and `pr-comment.md` fallback.

## Observability / reporting

Grafana now has two assurance views:
- `UAP Assurance Dashboard` (core quality/risk health)
- `UAP Assurance Governance Dashboard` (promotion, evidence integrity, exceptions, flaky policy, controls matrix, PR-style severity signals)

Validation commands:

```bash
make assurance-dashboard-check
make assurance-governance-check
```

These checks validate both Prometheus metrics availability and Grafana dashboard provisioning via API.

## Rollout safety profile (Sprint-02)

Use safe-first -> ambitious rollout in this order:

1. Ring/canary rollout with explicit soak window
2. Synthetic checks + SLO health review before expansion
3. Objective rollback triggers (error/latency/burn-rate thresholds)

Reference runbook: [`docs/sre/uap-reliability-playbook.md`](../sre/uap-reliability-playbook.md)

## Phase 2 local verification

```bash
make validate
make run-assurance-real
make validate-exceptions ENV=stage
make promotion-check ENV=stage
make report
```

## Example scenarios

- Passing with valid exception: `examples/phase2/exceptions-valid.yaml`
- Failing with expired exception: `examples/phase2/exceptions-expired.yaml`

Use by overriding exceptions directory:

```bash
make promotion-check ENV=stage EXCEPTIONS_DIR=examples/phase2
```
