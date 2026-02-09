# UAP Demo Quickstart

A 10-minute demo for non-QE stakeholders.

## Prerequisites
- `python3`
- Optional: Docker Desktop (for `demo-up` / `demo-down`)

## 1) Validate project
```bash
make validate
```

## 2) Start lightweight demo service
```bash
make demo-up
curl -s http://localhost:5678
```
Expected: `demo-api-ok`

## 3) Launch the demo website (nice stakeholder view)
```bash
make demo-site-up
open http://127.0.0.1:8790/demo/site/
```
On the page:
- click **Re-check API**
- toggle **Happy Path** / **Broken Path** to show GO vs NO-GO

## 4) Run happy-path report
```bash
make demo-happy
```
Expected recommendation in report: **GO**

## 5) Run broken-path report
```bash
make demo-broken
```
Expected recommendation in report: **NO-GO**

## 6) (Optional) Start broken mock profile
```bash
docker compose -f demo/docker-compose.yml --profile broken up -d
curl -i http://localhost:5679
```
Expected: HTTP 500

## 7) Stop demo services
```bash
make demo-down
make demo-site-down
```

## Outputs to show stakeholders
- `artifacts/latest/demo-happy-report.md`
- `artifacts/latest/demo-broken-report.md`
- `docs/demo-walkthrough.md`
