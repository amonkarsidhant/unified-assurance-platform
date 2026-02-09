# Audit Evidence Checklist

For each release candidate, archive:
- Build metadata (commit SHA, build ID, timestamp)
- Policy snapshots (`policies/*.yaml`)
- Gate evaluation input (`results.json`)
- Gate decision output (`release-report.md`)
- Raw scanner/test artifacts (JUnit, SARIF, logs)
- Exception approvals and expiry (if CONDITIONAL)
