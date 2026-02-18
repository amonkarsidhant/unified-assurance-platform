# Policy Engine Runbook

## Overview
This runbook covers common operational procedures for the UAP Policy Engine service.

## On-Call
- Primary: On-call engineer
- Escalation: Team lead

## Common Issues

### High Policy Evaluation Latency
1. Check Prometheus metrics for policy evaluation time
2. Review cache hit rates
3. Check database query performance

### Policy Cache Miss Spike
1. Review recent cache invalidation events
2. Check Redis connectivity
3. Verify cache configuration

## Runbook Links
- [Incident Response Procedure](./incident-response.md)
- [Post-Mortem Template](./postmortem-template.md)
