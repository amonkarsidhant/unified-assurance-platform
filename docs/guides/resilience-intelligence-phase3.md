# Resilience Intelligence Platform — Phase 3

Phase 3 adds scheduler-ready automation, incident-triggered targeted runs, and multi-service scorecards/trends while keeping Phase 1+2 contracts stable.

## Architecture delta from Phase 2

New components:
- `scripts/resilience-incident-trigger.py`
- `scripts/resilience-scorecard.py`
- `scripts/resilience-trend-export.py`
- `scripts/resilience-schedule-help.sh`

Extended components:
- `scripts/run-resilience-intelligence.sh`
  - emits `run_context` (`service`, `environment`, `tier`)
  - emits `trigger` metadata (`source`, `decision_artifact`)
  - archives historical snapshots under `artifacts/history/<service>/<env>/<tier>/<timestamp>/`
- `scripts/export-assurance-metrics.py`
  - exports service-level trend/scorecard metrics from `artifacts/latest/resilience-scorecard.json`

## Incident trigger flow

1. Create payload JSON (`service`, `environment`, `symptom_category`, `severity`, optional `incident_id`).
2. Run:
   ```bash
   make resilience-incident-trigger INCIDENT_PAYLOAD=examples/incidents/sample-incident.json
   ```
3. Trigger mapping:
   - `network` → `CHAOS` + `network-partition-api`
   - `db` → `CHAOS` + `db-failover-latency`
   - `app` → `ROBUSTNESS` + `robustness-fixed`
   - `queue` → `CHAOS` + `queue-backpressure-worker`
4. Artifacts:
   - `artifacts/latest/incident-runs/<service>/<env>/<incident-id>/incident-trigger-decision.json`
   - `.../resilience-intelligence.json`
   - `.../incident-trigger-result.json`

Decision artifact records trigger source and rationale for auditability.

## Scheduling playbook

Command help:
```bash
make resilience-schedule-help
```

Recommended scheduler run pattern:
- set `SERVICE_NAME`, `TARGET_ENV`, `RISK_TIER`
- keep `ART_DIR` isolated per execution if scheduler owns retention
- rely on built-in history archive for trend inputs

Examples:

### cron
```bash
0 * * * * cd /path/to/unified-assurance-platform && SERVICE_NAME=payments-api TARGET_ENV=stage RISK_TIER=high make resilience-intelligence
```

### OpenClaw scheduled command
```bash
cd /path/to/unified-assurance-platform && SERVICE_NAME=checkout-api TARGET_ENV=prod RISK_TIER=critical make resilience-intelligence
```

### GitHub Actions
```yaml
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  resilience:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make resilience-intelligence
      - run: make resilience-scorecard
      - run: make resilience-trend-export
```

## Multi-service scorecard interpretation

Generate artifacts:
```bash
make resilience-scorecard
make resilience-trend-export
```

Outputs:
- `artifacts/latest/resilience-scorecard.json` (machine-readable source of truth)
- `artifacts/latest/resilience-scorecard.md` (summary)

Per service, Phase 3 provides:
- resilience score trend (`score_trend`)
- correlation trend (`correlation_trend`)
- adapter participation average (`adapter_participation_avg`)
- pass/fail/skip counts (`status_counts`)
- environment+tier distribution (`environment_tier_counts`)

## KPI tie-in

Recommended KPIs:
- **Resilience Stability KPI**: slope/variance of `score_trend`
- **Signal Confidence KPI**: average `correlation_trend`
- **Coverage KPI**: adapter participation and run count by service
- **Operational Reliability KPI**: fail/skip ratio by tier

## Governance behavior

- Low/medium remain non-breaking.
- High/critical remain explicit observe-only for resilience intelligence unless future enforcement flags are enabled.
- No default enforcement escalation added in Phase 3.

## Security + review notes

- Payload parsing is strict JSON (no eval/shell interpolation).
- Incident identifiers are sanitized for safe path usage.
- External execution uses bounded timeout (`--timeout-seconds`).
- Failure/skip states are emitted with explicit reasons in artifacts.
