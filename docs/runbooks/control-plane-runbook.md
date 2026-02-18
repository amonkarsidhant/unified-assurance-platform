# Control Plane Runbook

## Overview
This runbook covers common operational procedures for the UAP Control Plane service.

## On-Call
- Primary: On-call engineer
- Escalation: Team lead

## Common Issues

### High Latency
1. Check Prometheus metrics: `rate(http_request_duration_seconds_bucket{job="uap-control-plane"}[5m])`
2. Check database connection pool metrics
3. Review recent logs for errors

### Service Down
1. Check Kubernetes pod status: `kubectl get pods -n uap -l app=control-plane`
2. Check recent deployments
3. Review error logs

## Runbook Links
- [Incident Response Procedure](./incident-response.md)
- [Post-Mortem Template](./postmortem-template.md)
