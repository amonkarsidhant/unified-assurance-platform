# Agnostic Chaos Integration Golden Path

Chaos in UAP is policy-enforced and injector-agnostic (not Kubernetes-first).

## Core flow
1. Define experiment using `templates/chaos/chaos-experiment-template.yaml`.
2. Execute safe local checks via `scripts/run-chaos-checks.sh`.
3. Persist evidence into `artifacts/latest/chaos-results.json`.
4. Promotion gate enforces chaos control for `high` and `critical` risk tiers.
5. Report + metrics + Grafana reflect chaos state.

## Module-specific minimum scenarios
- api: `network_latency`, `dependency_timeout`, `queue_backlog`
- frontend: `network_latency`, `dependency_timeout`
- worker: `process_kill`, `queue_backlog`, `resource_stress`
- shared-lib: `dependency_timeout`, `resource_stress`

## Commands
```bash
make chaos-check
make run-assurance
make promotion-check ENV=stage || true
make report
```

## Safety defaults
- Pragmatic mode simulates/marks skipped with explicit reason if tooling is missing.
- Optional tools are detected but not auto-run destructively:
  - Chaos Toolkit (`chaos`)
  - Toxiproxy (`toxiproxy-cli`)
  - Pumba (`pumba`)
  - stress-ng (`stress-ng`)
