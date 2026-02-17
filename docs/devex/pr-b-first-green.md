# PR-B First-Green Path (DevEx)

This is the deterministic, low-risk path to get a governance-heavy PR to first green without changing gate semantics.

## Command

```bash
make first-green
```

## What it runs

1. `make validate`
2. `make governance-artifacts-check`
3. `make lint-markdown`

## Failure summary contract (required style)

When a gate fails, include these fields in the failure message (or step summary):

- `check`: gate/check name
- `reason`: exact failure reason
- `reproduce`: exact local command
- `fix`: smallest next action
- `owner`: accountable role/team
- `evidence`: artifact link/path

## Notes

- This path is intentionally thin and wraps canonical checks already in the repo.
- It does **not** bypass or weaken guardrails from PR #37, #38, or #39.
- Use this for fast feedback before full `make ci-local` or assurance runs.
