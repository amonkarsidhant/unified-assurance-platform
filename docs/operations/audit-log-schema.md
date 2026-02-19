# UAP Audit Log Schema

> Audit logging for compliance - Issue #91

## Overview

Every promotion decision and governance action is logged to an audit trail for compliance.

## Log Location

```
artifacts/
  audit/
    YYYY-MM-DD.jsonl    # Daily audit logs
```

## Event Types

| Event | Description |
|-------|-------------|
| `promotion_decision` | GO/NO-GO/CONDITIONAL decision |
| `exception_approved` | Risk exception granted |
| `override_used` | Manual override applied |
| `gate_failed` | Quality gate failure |
| `evidence_verified` | Evidence integrity verified |

## Schema

```json
{
  "timestamp": "2026-02-19T21:00:00Z",
  "event": "promotion_decision",
  "actor": "system",
  "service": "sample-service",
  "environment": "stage",
  "risk_tier": "medium",
  "decision": "go",
  "reason": "All required gates passed",
  "gates": {
    "sast": "pass",
    "sca": "pass"
  },
  "metadata": {
    "run_id": "run-123",
    "commit_sha": "abc123"
  }
}
```

## Compliance

This audit format supports:
- SOC2 audit trails
- ISO 27001 logging requirements
- GDPR right to explanation

## CLI

```bash
# Query audit logs
make audit-query SERVICE=sample-service

# Export for compliance
make audit-export --from 2026-01-01 --to 2026-02-19
```
