# Phase A Open-Source Integrations

This phase adds four practical checks to the assurance flow:

- **Gitleaks** (`secret_scan`): detects committed/plaintext secrets.
- **Schemathesis** (`api_fuzz_contract`): OpenAPI-driven API contract/fuzz coverage.
- **Hadolint** (`dockerfile_policy`): Dockerfile lint/policy checks.
- **Checkov** (`iac_policy`): infrastructure-as-code policy checks.

## Default behavior

All wrappers are laptop-safe and non-destructive:

- If tool binary is missing → `skipped` with explicit reason in log.
- If sample asset is missing → `skipped` with explicit reason in log.
- If tool runs and passes → `pass`.
- If tool runs and finds violations/errors → `fail`.

Artifacts:
- Status files: `artifacts/latest/*.status`
- Logs: `artifacts/latest/*.log`
- Tool JSON outputs (when available): `gitleaks.json`, `hadolint.json`, `checkov.json`

## Commands

```bash
make phase-a-checks
make gitleaks-check
make schemathesis-check
make hadolint-check
make checkov-check
```

Integrated assurance flow:

```bash
make run-assurance
make run-assurance-real
```

## Replace sample assets with real service assets

By default wrappers use sample assets:

- OpenAPI: `examples/openapi/sample-openapi.yaml`
- Dockerfile: `examples/docker/Dockerfile.sample`
- IaC: `examples/iac/sample-terraform/`

For real service paths, override env vars:

```bash
SCHEMATHESIS_OPENAPI_FILE=services/payments/openapi.yaml \
SCHEMATHESIS_DRY_RUN=0 SCHEMATHESIS_BASE_URL=http://127.0.0.1:8080 \
HADOLINT_FILE=services/payments/Dockerfile \
CHECKOV_DIR=infra/terraform/payments \
make phase-a-checks
```
