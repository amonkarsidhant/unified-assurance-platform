# UAP Reliability Playbook (Sprint-02)

## Safe-first rollout policy

1. Ring/canary rollout first (small cohort)
2. Mandatory soak window before expansion
3. Expand only when thresholds are healthy

## Objective rollback triggers

Trigger immediate rollback when any condition is true:

- Error rate > **1.5x** baseline for **10m**
- p95 latency regression > **15%** for **10m**
- SLO burn-rate alert in rollout window
- Any Sev-2+ incident correlated to release
- Synthetic journey failures exceed tolerance for 2 consecutive runs

## Required reliability evidence per change

- Pre-change risk assessment
- Rollout + rollback runbook link
- On-call acknowledgement for high-risk changes
- Canary/synthetic evidence snapshots
- Post-change outcome note (incident/no-incident, MTTR if incident)

## Review checklist

- Thresholds are numeric and time-bounded
- Rollback criteria are objective and testable
- Evidence links are present in PR
- Risk tier and blast radius are declared
