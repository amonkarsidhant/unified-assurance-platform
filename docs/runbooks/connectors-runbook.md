# Connectors Runbook

## Overview
This runbook covers common operational procedures for the UAP Connectors service.

## On-Call
- Primary: On-call engineer
- Escalation: Team lead

## Common Issues

### Connector Failures
1. Check connector health: `GET /health/connectors`
2. Review connector-specific logs
3. Verify third-party API credentials

### Webhook Delivery Failures
1. Check webhook retry queue
2. Verify endpoint connectivity
3. Review delivery metrics

## Runbook Links
- [Incident Response Procedure](./incident-response.md)
- [Post-Mortem Template](./postmortem-template.md)
