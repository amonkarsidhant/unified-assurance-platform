# UAP Demo Quickstart

A 10-minute demo for non-QE stakeholders.

## Prerequisites
- `python3`
- Optional: Docker Desktop (for `demo-up` / `demo-down`)

## 1) Validate project
```bash
make validate
```

## 2) (Optional) Start lightweight demo service
```bash
make demo-up
curl -s http://localhost:5678
```
Expected: `demo-api-ok`

## 3) Run happy-path report
```bash
make demo-happy
```
Expected recommendation in report: **GO**

## 4) Run broken-path report
```bash
make demo-broken
```
Expected recommendation in report: **NO-GO**

## 5) (Optional) Start broken mock profile
```bash
docker compose -f demo/docker-compose.yml --profile broken up -d
curl -i http://localhost:5679
```
Expected: HTTP 500

## 6) Stop demo services
```bash
make demo-down
```

## Outputs to show stakeholders
- `artifacts/latest/demo-happy-report.md`
- `artifacts/latest/demo-broken-report.md`
- `docs/demo-walkthrough.md`
