# DevEx Failure Summary Contract

Use this when reporting CI/gate failures so reviewers can fix quickly.

## Required fields

- `check`: gate/check name
- `reason`: exact failure reason
- `repro`: exact local command
- `fix`: smallest next action
- `owner`: accountable role/team
- `artifact`: evidence path/link
- `class`: one of `env | policy | test | flake | infra | security`

## Standard example

```text
check: governance-guardrails
reason: pull request body section incomplete or missing: 'architecture guardrail compliance declaration'
repro: make governance-artifacts-check
fix: fill architecture guardrail declaration with non-empty details and set deviations to "None" when not applicable
owner: DevEx
artifact: artifacts/latest/pr-comment.md
class: policy
```

## Notes

- Governance automation currently emits `fix_hint` in some checks.
- In contributor-facing summaries, mirror `fix_hint` as `fix` for consistency.
