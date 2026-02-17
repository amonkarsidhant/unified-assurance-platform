# DevEx Metrics Baseline (Sprint-02)

This captures the baseline for:

- TTFG (time to first green)
- Failure-to-fix time
- PR cycle time

## Generate baseline

```bash
make devex-baseline
```

Output file:

- `artifacts/latest/devex-baseline.json`

## Definitions

- **PR cycle time**: PR opened -> PR merged
- **TTFG**: first commit in PR -> first successful workflow run completion (best effort)
- **Failure-to-fix**: first failed workflow run -> next successful run on same branch (best effort)

## Notes

- This script uses `gh api` and requires an authenticated GitHub CLI session.
- Metrics are intended for trend direction and sprint-level comparisons.
