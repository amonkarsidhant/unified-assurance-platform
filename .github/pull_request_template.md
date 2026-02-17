# Summary

<!-- What changed and why? -->

## Change type

- [ ] feat
- [ ] fix
- [ ] docs
- [ ] refactor
- [ ] test
- [ ] chore

## Risk assessment

- Risk level: **low / medium / high**
- Key risks:
- Mitigations:

## Validation

<!-- Include exact commands and outcomes -->

```bash
make validate
```

Additional checks

- (optional)

## Evidence

<!-- Link artifact paths, screenshots, or logs if applicable -->

- Artifacts:
- Screenshots:

## Policy and controls impact

- [ ] No policy/control impact
- [ ] Policy/control impact reviewed and documented

Details:

## Documentation impact

- [ ] No docs updates needed
- [ ] Docs updated (README/runbooks/guides)

## Architecture guardrail compliance declaration

- [ ] I confirm this change complies with established architecture guardrails ([reference](docs/architecture/guardrail-checklist.md)).
- [ ] Any guardrail deviations are documented with rationale + approval link (write "None" if there are no deviations).

Details (list guardrail(s) checked, compliance/deviation status, and if deviating include rationale + approval link):

## Reliability impact + rollback criteria

- Reliability impact (latency/error budget/SLO risk): <!-- e.g., +5% p95 latency, 2% error budget burn in 1h, or "none" -->
- Rollback trigger criteria (objective threshold): <!-- e.g., rollback if error rate >1% for 10m or SLO breach persists -->

## QA evidence completeness declaration

- [ ] I confirm the PR scope is covered by evidence above (automated test results, logs/artifacts for failures, and screenshots/repro steps where applicable).
- Evidence links (tests, logs, artifacts, screenshots):

## DevEx impact + local reproduce command

- Developer workflow impact (if any): <!-- e.g., no impact; requires DB migration + rerun seed scripts -->
- Local reproduce command:

```bash
# Command to reproduce this specific change locally
make validate
```

## Rollback plan

<!-- How to revert safely if needed -->

## Review checklist

- [ ] Scope is focused and free of unrelated changes
- [ ] CI is passing
- [ ] No unresolved review threads
- [ ] Security-sensitive changes are explicitly called out
- [ ] Ownership reviewers are assigned per CODEOWNERS
