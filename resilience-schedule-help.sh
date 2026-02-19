#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
Resilience Intelligence Scheduling Playbook (Phase 3)

1) Cron (hourly high-tier example)
   0 * * * * cd /path/to/unified-assurance-platform && TARGET_ENV=stage RISK_TIER=high SERVICE_NAME=payments-api make resilience-intelligence

2) OpenClaw scheduled task
   Command: cd /path/to/unified-assurance-platform && TARGET_ENV=prod RISK_TIER=critical SERVICE_NAME=checkout-api make resilience-intelligence
   Frequency: every 6h

3) GitHub Actions (nightly)
   Add workflow with:
     - cron: '0 2 * * *'
     - steps: make resilience-intelligence && make resilience-scorecard && make resilience-trend-export

Recommended repeatable output pattern:
   - ART_DIR=artifacts/history/<service>/<env>/<tier>/$(date -u +%Y%m%dT%H%M%SZ)
   - Then run make resilience-intelligence

This keeps outputs isolated and idempotent for repeated scheduled runs.
EOF
