# Reference Architecture Scorecard

## 1) Readiness Summary
- **Release window**: _TBD_
- **Overall status**: Green / Amber / Red
- **Scope**: LB, API, VM/infra, DB, queue/cache, worker, observability

## 2) Gate Status by Stage
- **PR Gate**: Pass/Fail - static checks, unit/integration, config validation
- **Pre-release Gate**: Pass/Fail - performance smoke, resilience drills, security scans
- **Post-deploy Gate**: Pass/Fail - synthetic tests, SLO burn check, alert verification

## 3) Top Risks (Current)
1. _Risk_: ____________________ | _Owner_: ______ | _Mitigation ETA_: ______
2. _Risk_: ____________________ | _Owner_: ______ | _Mitigation ETA_: ______
3. _Risk_: ____________________ | _Owner_: ______ | _Mitigation ETA_: ______

## 4) Evidence Checklist
- [ ] Test catalog coverage mapped to implemented services
- [ ] CI artifacts attached (test + security + performance)
- [ ] Failure injection scenarios executed and documented
- [ ] Operational runbooks reviewed (failover/rollback)

## 5) Trend Placeholders
- **4-release pass-rate trend**: _TBD_
- **Escaped defect trend**: _TBD_
- **MTTR trend**: _TBD_
- **Error budget consumption trend**: _TBD_
