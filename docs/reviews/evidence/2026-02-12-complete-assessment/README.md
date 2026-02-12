# Evidence Bundle — Complete Repo Assessment (2026-02-12)

This directory is the immutable evidence snapshot referenced by:

- `docs/reviews/complete-repo-assessment-2026-02-12.md`

It is intentionally versioned in git so reviewers can verify the assessment claims without relying on ignored `artifacts/latest/*` paths.

## Contents

- Command run logs: `make-*.log`
- Command exit codes: `make-*.exit`
- Decision artifacts:
  - `results.json`
  - `promotion-decision.json`
  - `flaky-policy.json`
  - `resilience-intelligence.json`
  - `resilience-scorecard.json`
  - `release-report.md`
  - `secret_scan.log`
  - `gitleaks.json`

## Verification

From repo root:

```bash
ls docs/reviews/evidence/2026-02-12-complete-assessment
cat docs/reviews/complete-repo-assessment-2026-02-12.md
```
