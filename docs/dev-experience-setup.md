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
- Missing optional assets (Postman collection / Playwright smoke spec) are marked as `skipped` with explicit reasons.
- Trivy is configured non-fatal by default (`TRIVY_EXIT_CODE=0`) so local runs remain practical.
- Typical laptop runtime target is a few minutes; keep k6 smoke small (`K6_VUS`, `K6_DURATION`) and ZAP baseline short (`ZAP_TIMEOUT_MIN`).
