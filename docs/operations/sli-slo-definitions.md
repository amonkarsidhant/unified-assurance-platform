# UAP SLI/SLO Definitions

> Enterprise reliability metrics for UAP - Issue #91

## Overview

This document defines Service Level Indicators (SLIs) and Service Level Objectives (SLOs) for the Unified Assurance Platform.

## SLIs (Service Level Indicators)

### Availability
- **Definition**: % of successful assurance runs vs total runs
- **Formula**: `(successful_runs / total_runs) * 100`
- **Measurement**: From `artifacts/latest/results.json`

### Reliability
- **Definition**: % of promotion decisions that are consistent
- **Formula**: `(consistent_decisions / total_decisions) * 100`
- **Measurement**: From `artifacts/latest/promotion-decision.json`

### Latency
- **Definition**: P95 time for assurance pipeline completion
- **Formula**: 95th percentile of run duration
- **Measurement**: From CI/CD pipeline logs

### Quality
- **Definition**: % of gates passing on first try
- **Formula**: `(first_try_passes / total_runs) * 100`
- **Measurement**: From `artifacts/latest/results.json`

## SLOs (Service Level Objectives)

| SLO | Target | Critical Threshold |
|-----|--------|-------------------|
| Availability | 99.9% | 99.0% |
| Reliability | 99.5% | 98.0% |
| Latency (P95) | < 5 min | < 10 min |
| Quality (First Pass) | 95% | 90% |

## Alignment with Reliability Gates

The SLOs align with the existing `policies/reliability-gates.yaml`:

| Gate Type | Related SLO |
|-----------|-------------|
| `unit_tests` | Quality |
| `integration_tests` | Quality |
| `contract_tests` | Reliability |
| `smoke_tests` | Availability |
| `security_scan` | Quality |

## Measurement

```bash
# Check current SLIs
make metrics-sli

# Check SLO compliance
make metrics-slo

# Export for compliance
make metrics-export
```

## Alerting

When SLOs breach critical threshold:
1. Alert via configured webhook
2. Create incident issue
3. Log to audit trail

## Reference

- Reliability Gates: `policies/reliability-gates.yaml`
- Audit: Issue #91
