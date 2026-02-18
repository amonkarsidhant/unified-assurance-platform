# SRE PR-B Phase-2: Reliability Safeguards + Rollback Triggers

**Source:** Issue #43  
**Parent:** Issue #41 (Sequencing)

---

## Objective

Add safe rollout controls and objective rollback triggers for phase-2 changes.

---

## Deliverables

### 1. Canary/Safe-First Rollout Guardrails

**Principles:**
- Deploy to staging/canary first
- Monitor key metrics (latency, error rate, throughput)
- Gradual traffic shift (10% → 50% → 100%)

**Guardrail Checklist:**
- [ ] Staging deployment passes
- [ ] Smoke tests pass in staging
- [ ] Metrics within acceptable thresholds
- [ ] On-call alerted for canary deployment
- [ ] Rollback plan documented

### 2. Explicit Rollback Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% for 5m | Alert on-call |
| p99 Latency | > 500ms increase | Alert on-call |
| CPU Usage | > 80% sustained | Scale up |
| Memory Usage | > 90% | Alert on-call |
| Availability | < 99.9% | Page on-call |

**Rollback Triggers:**
- Error rate > 5% for 2m → Immediate rollback
- Latency p99 > 2x baseline → Immediate rollback
- Any security finding → Immediate rollback

### 3. Reliability Evidence Checklist

**Required for PR Merge:**
- [ ] Runbook link for each change
- [ ] Monitoring/dashboard link
- [ ] Alert configuration documented
- [ ] Rollback procedure tested (or documented)

---

## Definition of Done

- [ ] Rollout guardrails documented
- [ ] Rollback thresholds defined with objective metrics
- [ ] Reliability evidence checklist created
- [ ] Linked to Issue #44 (QA)
