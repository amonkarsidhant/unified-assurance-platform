# Module Onboarding Template

Use this template when introducing a new module into the repository.

## Module identity
- Module name:
- Module type (frontend/api/worker/shared-lib/infra):
- Business capability:
- Criticality (low/medium/high):

## Ownership
- Primary owner team:
- Secondary owner(s):
- Slack/Teams channel:
- On-call rotation:

## Interfaces and dependencies
- Upstream dependencies:
- Downstream consumers:
- External systems/contracts:

## Assurance profile
- Risk tier:
- Mandatory tests:
- Promotion criteria:
- Rollback strategy:

## CI/CD setup
- Path filters added:
- Reusable workflow wired:
- Required PR checks configured:
- Stage/prod deployment job names:

## Operational readiness
- SLO/SLA target:
- Alerts and dashboards:
- Runbook location:
- Incident severity mapping:

## Sign-off checklist
- [ ] CODEOWNERS updated
- [ ] `config/modules/<module-type>.json` aligned or specialized profile created
- [ ] Module CI workflow references reusable assurance workflow
- [ ] Golden path generated in `docs/generated/`
- [ ] Team handover/session completed
