# Resilience Intelligence Platform — Phase 2

Phase 2 extends the Phase 1 orchestration with adapter inputs, deterministic cross-signal correlation, expanded scenario templates, and a dedicated report artifact.

## What is new

- Adapter framework under `scripts/adapters/resilience/`
  - `locust-adapter.sh`
  - `external-results-adapter.sh`
- Adapter contract validator: `scripts/validate-resilience-adapter.py`
- Correlation block in `artifacts/latest/resilience-intelligence.json`
  - `correlation.status`
  - `correlation.score`
  - `correlation.explanation`
- Expanded scenario catalog in `templates/scenarios/resilience/` (5 templates)
- New report generator: `scripts/generate-resilience-report.py`
- MCP-ready wrappers:
  - `scripts/mcp-resilience-intelligence-run.sh`
  - `scripts/mcp-resilience-intelligence-artifacts.sh`

## Adapter contract and validation path

Each adapter must print one JSON object to stdout with this minimum shape:

```json
{
  "adapter": "name",
  "signal": "load|resilience|external",
  "status": "pass|fail|skipped",
  "reason": "human-readable reason",
  "metrics": {
    "error_rate": 0.0,
    "pass_rate": 1.0,
    "degradation": 0.0
  },
  "metadata": {}
}
```

Validation path used by the orchestrator:

1. Adapter executes with bounded timeout (20s)
2. Output stored in `artifacts/latest/resilience-adapter-<name>.json`
3. `scripts/validate-resilience-adapter.py --input <file>`
4. Valid payloads are aggregated into `artifacts/latest/resilience-adapters.json`

Invalid adapter payloads are ignored (non-breaking behavior).

## Correlation logic (deterministic)

Inputs:
- load degradation (k6 error rate if available, else adapter degradation average, else `0`)
- chaos status (`pass|fail|skipped`)
- resulting resilience status (`pass|fail|skipped`)

Output:
- `correlation.score` in `[0,1]`
- `correlation.status` in `strong|partial|degraded`
- explanation string for auditability

If optional inputs are missing, the run remains deterministic with fallback defaults.

## Policy/gate progression

- Low/medium tiers remain non-breaking.
- High/critical keep resilience intelligence as observe-only in promotion audit rationale.
- No enforcement changes were introduced for resilience intelligence in Phase 2.

## Runbook

```bash
make validate
make resilience-adapter-check
make resilience-intelligence
make resilience-report
make run-assurance
make report
make assurance-governance-check   # if local Grafana/Prometheus stack is up
```

## Known caveats

- `jq` is required for orchestration and summary generation.
- `k6`/`locust` are optional; missing tools produce explicit `skipped` states.
- Adapter scripts must emit JSON only (stdout) to pass contract validation.
