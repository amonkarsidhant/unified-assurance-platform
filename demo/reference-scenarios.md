# Reference Architecture Failure Injection Scenarios

Run these in staging before release approval.

## 1) DB replica lag spike
- **Inject**: throttle replica I/O or network to create lag.
- **Expected behavior**:
  - Read paths relying on replica degrade gracefully or switch to primary-safe mode.
  - Alert fires before lag breaches hard threshold window.
- **Pass criteria**:
  - No data corruption.
  - Lag alert triggered and acknowledged.
  - Recovery to normal lag within target time.

## 2) API timeout spike
- **Inject**: add latency to downstream dependency used by API.
- **Expected behavior**:
  - API enforces timeout and returns controlled errors/fallback.
  - Circuit breaker or retry budget prevents cascading failure.
- **Pass criteria**:
  - Error rate remains within defined incident threshold.
  - p95 latency recovers after rollback/remediation.

## 3) VM node loss
- **Inject**: terminate one API VM and one worker VM unexpectedly.
- **Expected behavior**:
  - LB drains dead node and routes to healthy nodes.
  - Replacement node comes up and joins pool.
- **Pass criteria**:
  - No prolonged 5xx spike beyond threshold window.
  - Capacity restored within recovery objective.

## 4) LB misroute
- **Inject**: apply bad route rule in controlled window.
- **Expected behavior**:
  - Synthetic check detects endpoint mismatch quickly.
  - Rollback playbook restores route.
- **Pass criteria**:
  - Detection within agreed SLA.
  - Route rollback verified by smoke tests.

## 5) Queue backlog growth
- **Inject**: reduce worker concurrency or pause consumers briefly.
- **Expected behavior**:
  - Backlog alert fires on age/depth.
  - Workers catch up after resume/scale-out.
- **Pass criteria**:
  - No message loss.
  - Backlog drains to baseline within target time.
  - DLQ rate remains within policy.
