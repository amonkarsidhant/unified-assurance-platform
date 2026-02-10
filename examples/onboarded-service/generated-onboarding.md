# UAP Onboarding Checklist: orders-api

- **Service**: `orders-api`
- **Type**: `api`
- **Risk tier**: `high`

## 30-minute onboarding checklist
- [x] Confirm service profile generated in `config/services/`
- [x] Add CODEOWNERS snippet from onboarding artifact
- [x] Run preflight and capture first output
- [x] Confirm dashboard visibility in Grafana
- [ ] Agree exception owner and escalation path
- [x] Compute onboarding score

## Owners
- @orders-owner
- @security-owner

## Initial preflight command block
```bash
make preflight MODULE=orders-api TYPE=api
make explain-last-fail
make suggest-next-steps
```
