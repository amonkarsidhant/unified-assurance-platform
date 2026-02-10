# End-to-End Code Review (Nothing Missed Pass)

Use this before major merges/releases when you want a complete quality + security + policy review pass.

## Run

```bash
make end-to-end-review
```

## What it checks

1. Repository structure validation (`make validate`)
2. Tooling checks (`make tooling-check`)
3. Phase A controls (`make phase-a-checks`)
4. Assurance run (real mode first, pragmatic fallback)
5. Reporting + promotion decision (`make report`, `make promotion-check ENV=stage`)
6. Governance visibility checks (Prometheus/Grafana if stack is up)
7. Baseline security pattern scan for risky command patterns
8. Consolidated summary artifact

## Output artifacts

- `artifacts/latest/end-to-end-review-summary.md`
- `artifacts/latest/security-pattern-review.md`
- `artifacts/latest/results.json`
- `artifacts/latest/results.v2.json`
- `artifacts/latest/release-report.md`
- `artifacts/latest/promotion-decision.json`

## Review checklist

- All mandatory controls for target tier are `pass` or approved `skipped`
- `critical_test_failures == 0`
- Promotion decision is explicitly reviewed (failures understood or approved)
- No hardcoded credentials introduced
- No unsafe shell injection paths added
- Exceptions are time-bound and owner-assigned
- Evidence artifacts exist and are readable

This is designed to be practical: it does not hide failures, it surfaces them in one place for an explicit review decision.
