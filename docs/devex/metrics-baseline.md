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

## Sampling window and cadence

- Default window: last 20 merged PRs (`--limit 20`)
- Refresh cadence: weekly (or after major workflow changes)
- Owner: DevEx role

## How to interpret

- `p50`: typical experience
- `p90`: tail experience; use this for risk alerts
- Trigger investigation when p50 or p90 regresses by >15% week-over-week.

## Baseline snapshot template

| metric | definition | window | p50 | p90 | sample_size | captured_at |
|---|---|---|---:|---:|---:|---|
| TTFG | first commit -> first green run | last 20 merged PRs | _fill_ | _fill_ | _fill_ | _fill_ |
| failure_to_fix | first failed run -> next success | last 20 merged PRs | _fill_ | _fill_ | _fill_ | _fill_ |
| pr_cycle_time | PR open -> merge | last 20 merged PRs | _fill_ | _fill_ | _fill_ | _fill_ |

## Notes

- This script uses `gh api` and requires an authenticated GitHub CLI session.
- Metrics are intended for trend direction and sprint-level comparisons.
- Keep generated data in `artifacts/latest/devex-baseline.json` and summarize key values in PR/issue comments.
