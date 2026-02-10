# Developer onboarding mode (UAP)

This mode helps teams onboard a new service into UAP in under 30 minutes.

## Outcome

After onboarding you should have:
- service profile (`config/services/<service>.json`)
- service checklist (`docs/generated/onboarding-<service>.md`)
- CODEOWNERS suggestion (`artifacts/latest/onboarding/<service>-codeowners.txt`)
- onboarding score (`artifacts/latest/onboarding/<service>-score.json` + `.md`)

## 30-minute workflow

1) Validate repository baseline:

```bash
make validate
```

2) Scaffold onboarding for a service:

```bash
make onboard SERVICE=payments-api TYPE=api TIER=high OWNERS=api-owner,security-owner
```

3) Run first preflight (printed by onboard command as well):

```bash
make preflight MODULE=payments-api TYPE=api
```

4) Compute readiness score:

```bash
make onboarding-score SERVICE=payments-api
```

5) Review staged adoption plan:

```bash
make onboarding-plan SERVICE=payments-api
```

6) Verify Grafana governance visibility:

```bash
make assurance-governance-check
curl -fsS "http://localhost:9090/api/v1/query?query=onboarding_score"
curl -fsS "http://localhost:9090/api/v1/query?query=onboarding_ready"
curl -fsS "http://localhost:9090/api/v1/query?query=onboarding_stage_current"
curl -fsS "http://localhost:9090/api/v1/query?query=onboarding_plan_exists"
```

Expected Grafana dashboard panels in **UAP Assurance Governance Dashboard**:
- Onboarding score (stat)
- Onboarding readiness (stat)
- Onboarding current stage (table)
- Onboarding plan exists (stat)

## Staged adoption model

Defined in `config/onboarding-stages.json`:
- **Stage A (visibility only)**: no blocking gates, gather baseline
- **Stage B (soft gates)**: warnings and explicit owner acknowledgment
- **Stage C (hard gates)**: enforced promotion/release gates

Default durations and entry/exit criteria are included per stage.

## Notes

- Keep owner identifiers consistent with your CODEOWNERS strategy.
- Use exception workflow templates in `config/exceptions/` for temporary deviations.
- Re-run `make onboarding-score SERVICE=<service>` after each milestone.
