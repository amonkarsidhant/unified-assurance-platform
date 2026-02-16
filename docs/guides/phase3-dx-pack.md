# Phase 3 DX Pack

Phase 3 adds a thin developer experience layer on top of the existing assurance engine.

## What it adds

- `scripts/preflight.py`: one entrypoint for module-aware checks
- module profiles: `config/module-profiles/*.json`
- failure translator: `scripts/explain-failures.py` + `config/remediation-map.yaml`
- action prioritization: `scripts/suggest-next-steps.py`
- exception draft generator: `scripts/request-exception.py`

## Developer workflow

```bash
make preflight MODULE=payments-api TYPE=api
make explain-last-fail
make suggest-next-steps
make request-exception CONTROL=dast_zap REASON='Temporary false positive' EXPIRY_DAYS=7
```

## Outputs

- `artifacts/latest/preflight-summary.json`
- `artifacts/latest/preflight-summary.md`
- `artifacts/latest/failure-explanations.json`
- `artifacts/latest/failure-explanations.md`
- `artifacts/latest/next-steps.md`
- `config/exceptions/requests/EXC-REQ-*.yaml`

## Notes

- Profiles run minimal checks first, then escalate based on failure/risk/changed-files policy.
- Existing assurance scripts and Make targets remain the source of truth.
- Metrics export now emits preflight signals (`assurance_preflight_passed`, `assurance_preflight_escalated`).
