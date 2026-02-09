# Component Contracts

Use these as release-time contracts. If a contract is unmet, the corresponding gate should fail.

## 1) Load Balancer (LB)
- **Inputs**: HTTPS traffic on approved hostnames/paths.
- **Outputs**: Routed traffic to healthy API backends.
- **SLO/SLA checks**:
  - 5xx rate below agreed threshold (example: <1% during smoke load)
  - Health checks remove unhealthy nodes within expected window
- **Evidence**: LB config diff, route table, health-check logs, 5xx metric snapshot.

## 2) API Services
- **Inputs**: Versioned REST/gRPC contracts, authenticated requests.
- **Outputs**: Deterministic response codes, schema-compliant payloads, trace IDs.
- **SLO checks**:
  - p95 latency threshold per endpoint class
  - Error budget burn within policy
- **Evidence**: unit/integration/contract results, latency report, error-rate panel capture.

## 3) VM/Infra Pool
- **Inputs**: Immutable image + startup config.
- **Outputs**: Healthy nodes registered and serving.
- **Reliability checks**:
  - Autoscaling or replacement for node loss
  - No config drift on critical packages/agent versions
- **Evidence**: image provenance, drift scan, node replacement event, infra smoke results.

## 4) Database (Primary + Replica)
- **Inputs**: ACID writes to primary, read traffic to replica where allowed.
- **Outputs**: Consistent commits, bounded replica lag, successful backups.
- **Data checks**:
  - Replica lag within threshold (example: <5s steady-state)
  - Backup/restore verification passed
- **Evidence**: replication metrics, backup report, schema migration log, restore test output.

## 5) Queue
- **Inputs**: Durable enqueue from API.
- **Outputs**: At-least-once delivery to workers.
- **Operational checks**:
  - Backlog age below threshold
  - DLQ policy and replay runbook tested
- **Evidence**: queue depth/backlog graphs, DLQ test logs, replay evidence.

## 6) Cache
- **Inputs**: Hot keys from API/worker.
- **Outputs**: Fast reads with explicit TTL and fallback behavior.
- **Operational checks**:
  - Hit rate target for defined endpoints
  - Cache outage fallback does not break core transactions
- **Evidence**: hit/miss report, TTL policy, fallback smoke test.

## 7) Worker Services
- **Inputs**: Queue messages with idempotency key.
- **Outputs**: Completed async processing, status updates, retriable failures.
- **Operational checks**:
  - Idempotency validated under replay
  - Poison message handling verified
- **Evidence**: worker test report, idempotency replay logs, retry/DLQ metrics.
