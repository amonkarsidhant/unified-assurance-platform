# Demo Scenarios

This demo intentionally keeps setup lightweight and local.

## Happy path
- Start `demo-api` (HTTP 200)
- Use `examples/results/demo-happy.json`
- Expected recommendation: **GO**

## Broken path
- Option A (no Docker needed): use `examples/results/demo-broken.json`
- Option B (with Docker): start `demo-api-broken` profile (HTTP 500 simulator)

Expected recommendation: **NO-GO** because mandatory gates fail.

## Failure injection toggles
- `docker compose -f demo/docker-compose.yml --profile broken up -d`
  - Enables a mock failing endpoint on port `5679`
- `make demo-broken`
  - Uses intentionally failing metrics to show stakeholder-visible NO-GO output

## Why this is useful
- Demonstrates report readability to non-QE stakeholders
- Shows clear difference between healthy vs risky release evidence
- Works offline with local files and optional lightweight containers
