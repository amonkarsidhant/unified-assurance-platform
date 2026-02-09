# Local Dev Experience Setup (15-minute path)

This guide gives you a one-command local observability stack for end-to-end assurance flows.

## What you get

`docker compose up -d` (via `make dev-stack-up`) starts:

- Grafana
- Prometheus
- Loki
- Tempo
- OpenTelemetry Collector

All config lives in `infra/local/`.

## Prerequisites (macOS)

- Docker Desktop running
- GNU Make available (`make -v`)
- curl available (`curl --version`)

## Quick start (about 15 minutes)

From repo root:

```bash
make dev-stack-up
make dev-stack-status
./scripts/dev-stack-smoke.sh
```

If all checks pass, run assurance workflow:

```bash
make tooling-check
make run-assurance
make run-assurance-real
make report RESULTS=artifacts/latest/results.json OUT=artifacts/latest/real-tools-report.md
```

## Assurance Dashboard

The local stack includes `node-exporter` textfile collector wired to `artifacts/metrics/`.

`make run-assurance` and `make run-assurance-real` automatically export assurance metrics to:
- `artifacts/metrics/assurance.prom`

### Exact flow

```bash
make dev-stack-down && make dev-stack-up
make run-assurance-real || true
make promotion-check ENV=stage || true
make assurance-dashboard-check
make assurance-governance-check
```

Manual export (if needed):

```bash
make assurance-metrics-export
```

What `make assurance-dashboard-check` validates:
- Prometheus query returns `assurance_pass_rate`
- Grafana API search finds `UAP Assurance Dashboard`

What `make assurance-governance-check` validates:
- Prometheus returns governance metrics including:
  - `assurance_promotion_allowed`
  - `assurance_promotion_failed_gates_total`
  - `assurance_evidence_signature_required`
  - `assurance_exceptions_active_total`
  - `assurance_flaky_violations_total`
  - `assurance_control_pass`
  - `assurance_pr_summary_severity_total`
- Grafana API search finds `UAP Assurance Governance Dashboard`

Dashboard location in Grafana:
- **Dashboards → UAP → UAP Assurance Dashboard**
- **Dashboards → UAP → UAP Assurance Governance Dashboard**

Trend persistence caveat:
- Trend panels reflect Prometheus time series over scrape time.
- If local stack is torn down without persistent Prometheus data, trend history resets.

When done:

```bash
make dev-stack-down
```

## URLs and ports

- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100
- Tempo: http://localhost:3200
- OTel Collector OTLP gRPC: `localhost:4319`
- OTel Collector OTLP HTTP: `localhost:4320`
- OTel Collector health: http://localhost:13133
- OTel Collector metrics export (for Prometheus scrape): http://localhost:8889/metrics

## Sanity checks

- `make dev-stack-status` shows all services as `Up`.
- `./scripts/dev-stack-smoke.sh` returns all ✅ checks.
- In Grafana, data sources are pre-provisioned:
  - Prometheus
  - Loki
  - Tempo

## Local + CI assurance flow

### Local

1. Start stack (`make dev-stack-up`)
2. Run assurance (`make run-assurance`)
3. Generate report if needed (`make report`)
4. Stop stack (`make dev-stack-down`)

### CI options

- **Primary recommendation: GitHub Actions**
  - Run `make validate`
  - Run `make run-assurance`
  - Upload `artifacts/latest/` as build artifacts
- **Optional: GitLab CI**
  - Mirror same commands in `.gitlab-ci.yml`
  - Preserve `artifacts/latest/` and `evidence/` as pipeline artifacts

The same make targets can be used both locally and in CI for consistent behavior.

## Real mode caveats

- Real mode (`make run-assurance-real`) prefers installed OSS tools and writes tool-specific evidence under `artifacts/latest/`.
- OWASP ZAP baseline is included in real mode and writes `artifacts/latest/dast_zap.status` + `artifacts/latest/dast_zap.log`.
- ZAP tuning env vars: `ZAP_TARGET_URL` (default `http://127.0.0.1:5678`), `ZAP_TIMEOUT_MIN` (default `2`), `ZAP_FAIL_LEVEL` (default `medium`).
- Run only ZAP (fast smoke): `make zap-smoke`.
- On macOS, if Gatekeeper blocks downloaded security tools, prefer Homebrew installs or explicitly allow binaries in **System Settings → Privacy & Security**.
- Default sample assets are included (`tests/api/postman_collection.json`, `tests/ui/smoke.spec.ts`), so Newman/Playwright run by default in real mode.
- Trivy is configured non-fatal by default (`TRIVY_EXIT_CODE=0`) so local runs remain practical.
- Typical laptop runtime target is a few minutes; keep k6 smoke small (`K6_VUS`, `K6_DURATION`) and ZAP baseline short (`ZAP_TIMEOUT_MIN`).
