# Consumer Quickstart (10 minutes)

This is the fastest path for a new team to onboard one service into UAP.

## 0) Clone + enter repo

```bash
git clone <your-uap-repo-url>
cd unified-assurance-platform
```

## 1) Validate baseline

```bash
make bootstrap
make validate
```

## 2) Onboard one service (example: payments-api)

```bash
make onboard SERVICE=payments-api TYPE=api TIER=high OWNERS=api-owner,security-owner
```

Generated:
- `config/services/payments-api.json`
- `docs/generated/onboarding-payments-api.md`
- `artifacts/latest/onboarding/payments-api-codeowners.txt`

## 3) Run preflight

```bash
make preflight MODULE=payments-api TYPE=api
```

Generated:
- `artifacts/latest/preflight-summary.json`
- `artifacts/latest/preflight-summary.md`

## 4) Get onboarding readiness + staged plan

```bash
make onboarding-score SERVICE=payments-api
make onboarding-plan SERVICE=payments-api
```

Generated:
- `artifacts/latest/onboarding/payments-api-score.json`
- `artifacts/latest/onboarding/payments-api-score.md`
- `artifacts/latest/onboarding/payments-api-plan.md`

## 5) Dashboard check (governance visibility)

```bash
make dev-stack-up
make assurance-governance-check
```

Open:
- Grafana: `http://localhost:3000` (admin/admin)
- Prometheus: `http://localhost:9090`

Stop stack when done:

```bash
make dev-stack-down
```

## One-command printout for new developers

```bash
make consumer-quickstart
```
